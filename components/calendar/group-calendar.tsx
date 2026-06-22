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
}: {
  groupId: string;
  userId: string;
}) {
  const supabase = createClient();

  const { data: events = [] } = useQuery({
    queryKey: ["group-calendar", groupId, userId],
    queryFn: async (): Promise<EventInput[]> => {
      const [{ data: groupEvents }, { data: blocks }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, start_at, end_at")
          .eq("group_id", groupId),
        supabase
          .from("availability_blocks")
          .select("id, start_at, end_at, status")
          .eq("user_id", userId)
          .limit(500),
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

      const blockItems: EventInput[] = (blocks ?? []).map((b) => ({
        id: `block-${b.id}`,
        title: AVAILABILITY_META[b.status].label,
        start: b.start_at,
        end: b.end_at,
        display: "background",
        classNames: [`status-${b.status}`],
      }));

      return [...blockItems, ...eventItems];
    },
  });

  return <CalendarView events={events} initialView="dayGridMonth" />;
}
