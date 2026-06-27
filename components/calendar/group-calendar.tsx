"use client";

import { useQuery } from "@tanstack/react-query";
import type { EventInput } from "@fullcalendar/core";
import { createClient } from "@/lib/supabase/client";
import { CalendarView } from "./calendar-view";
import { AVAILABILITY_META } from "@/lib/constants";

/**
 * Shared group calendar: overlays the viewer's own availability (as background
 * blocks) with the group's events. Month / week / agenda views are available
 * via the toolbar.
 */
export function GroupCalendar({
  groupId,
  userId,
  timezone,
}: {
  groupId: string;
  userId: string;
  timezone: string;
}) {
  const supabase = createClient();

  const { data: events = [] } = useQuery({
    queryKey: ["group-calendar", groupId, userId],
    queryFn: async (): Promise<EventInput[]> => {
      const [{ data: groupEvents }, { data: myBlocks }, { data: sharedBlocks }] =
        await Promise.all([
          supabase
            .from("events")
            .select("id, title, start_at, end_at")
            .eq("group_id", groupId),
          // Viewer's own blocks shown as background
          supabase
            .from("availability_blocks")
            .select("id, start_at, end_at, status")
            .eq("user_id", userId)
            .limit(500),
          // Open slots any member shared with this group — shown green
          supabase
            .from("availability_block_shares")
            .select("block:availability_blocks(id, start_at, end_at, user_id)")
            .eq("group_id", groupId),
        ]);

      const eventItems: EventInput[] = (groupEvents ?? []).map((e) => ({
        id: `event-${e.id}`,
        title: e.title,
        start: e.start_at,
        end: e.end_at,
        url: `/events/${e.id}`,
        backgroundColor: "var(--primary)",
        borderColor: "var(--primary)",
      }));

      const myBlockItems: EventInput[] = (myBlocks ?? []).map((b) => ({
        id: `block-${b.id}`,
        title: AVAILABILITY_META[b.status].label,
        start: b.start_at,
        end: b.end_at,
        display: "background",
        classNames: [`status-${b.status}`],
      }));

      // Dedupe by block id (a member may share the same block with multiple groups)
      const seen = new Set<string>();
      const openSlotItems: EventInput[] = [];
      for (const row of sharedBlocks ?? []) {
        const b = row.block as { id: string; start_at: string; end_at: string; user_id: string } | null;
        if (!b || seen.has(b.id)) continue;
        seen.add(b.id);
        openSlotItems.push({
          id: `open-${b.id}`,
          title: b.user_id === userId ? "Your open slot" : "Open slot",
          start: b.start_at,
          end: b.end_at,
          classNames: ["status-free"],
          backgroundColor: "var(--free)",
          borderColor: "var(--free)",
        });
      }

      return [...myBlockItems, ...openSlotItems, ...eventItems];
    },
  });

  return (
    <CalendarView
      events={events}
      initialView="dayGridMonth"
      timeZone={timezone}
    />
  );
}
