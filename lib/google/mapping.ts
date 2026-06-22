import type { TablesInsert } from "@/lib/types/database.types";

export interface GoogleEvent {
  id: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

/**
 * Maps Google Calendar events to availability blocks. We deliberately keep
 * ONLY the time window and a derived status — never the event title.
 *
 * Mapping: a confirmed, opaque (non-"free") timed event => COMMITTED (Busy).
 * Cancelled, transparent ("free"), or all-day events are ignored so the user's
 * availability stays meaningful.
 */
export function mapEventsToBlocks(
  events: GoogleEvent[],
  userId: string,
): TablesInsert<"availability_blocks">[] {
  const blocks: TablesInsert<"availability_blocks">[] = [];
  for (const e of events) {
    if (e.status === "cancelled") continue;
    if (e.transparency === "transparent") continue;
    const start = e.start?.dateTime;
    const end = e.end?.dateTime;
    if (!start || !end) continue; // skip all-day / date-only events

    blocks.push({
      user_id: userId,
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      status: "committed",
      source: "google",
      external_id: e.id,
    });
  }
  return blocks;
}
