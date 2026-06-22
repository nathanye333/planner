import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/types/database.types";
import {
  fetchCalendarEvents,
  googleConfigured,
  refreshAccessToken,
} from "./calendar";
import { mapEventsToBlocks } from "./mapping";

type Client = SupabaseClient<Database>;
type Connection = Pick<
  Tables<"calendar_connections">,
  "refresh_token" | "sync_enabled"
>;

export interface SyncResult {
  synced: number;
  skipped?: boolean;
  message?: string;
}

const WINDOW_PAST_DAYS = 1;
const WINDOW_FUTURE_DAYS = 30;

/**
 * Sync one user's Google Calendar into availability_blocks. Works with either
 * a user-scoped client (RLS) or the service-role client (cron). Idempotent:
 * non-overridden google blocks are replaced; user overrides are preserved.
 */
export async function syncUserCalendar(
  client: Client,
  userId: string,
  connection: Connection,
): Promise<SyncResult> {
  if (!googleConfigured()) {
    return {
      synced: 0,
      skipped: true,
      message: "Google Calendar is not configured on the server yet.",
    };
  }
  if (!connection.refresh_token) {
    return {
      synced: 0,
      skipped: true,
      message: "Reconnect Google with offline access to enable sync.",
    };
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  if (!refreshed) {
    return {
      synced: 0,
      skipped: true,
      message: "Could not refresh Google access. Try reconnecting.",
    };
  }

  const timeMin = new Date(Date.now() - WINDOW_PAST_DAYS * 86_400_000);
  const timeMax = new Date(Date.now() + WINDOW_FUTURE_DAYS * 86_400_000);
  const events = await fetchCalendarEvents(
    refreshed.accessToken,
    timeMin,
    timeMax,
  );
  const mapped = mapEventsToBlocks(events, userId);

  const { data: overrides } = await client
    .from("availability_blocks")
    .select("external_id")
    .eq("user_id", userId)
    .eq("source", "google")
    .eq("is_override", true);
  const overrideIds = new Set(
    (overrides ?? []).map((o) => o.external_id).filter(Boolean),
  );

  // Replace all non-overridden google blocks with the freshly mapped set.
  await client
    .from("availability_blocks")
    .delete()
    .eq("user_id", userId)
    .eq("source", "google")
    .eq("is_override", false);

  const toInsert = mapped.filter((b) => !overrideIds.has(b.external_id ?? ""));
  if (toInsert.length > 0) {
    await client.from("availability_blocks").insert(toInsert);
  }

  await client
    .from("calendar_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      access_token: refreshed.accessToken,
      token_expiry: refreshed.expiresAt,
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return { synced: toInsert.length };
}
