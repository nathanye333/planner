import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserCalendar } from "@/lib/google/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * On-demand sync for the signed-in user.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("refresh_token, sync_enabled")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (!connection) {
    return NextResponse.json(
      { error: "Connect Google Calendar first." },
      { status: 400 },
    );
  }

  try {
    const result = await syncUserCalendar(supabase, user.id, connection);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}

/**
 * Cron entrypoint (Vercel Cron). Syncs every enabled connection using the
 * service-role client. Protected by the CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("calendar_connections")
    .select("user_id, refresh_token, sync_enabled")
    .eq("sync_enabled", true);

  let totalSynced = 0;
  let users = 0;
  for (const conn of connections ?? []) {
    try {
      const result = await syncUserCalendar(admin, conn.user_id, conn);
      totalSynced += result.synced;
      users += 1;
    } catch {
      // Skip failing users; continue the batch.
    }
  }

  return NextResponse.json({ users, synced: totalSynced });
}
