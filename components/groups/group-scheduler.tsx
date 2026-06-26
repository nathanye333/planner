"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AvailabilityGrid } from "@/components/planner/availability-grid";
import { schedulingEngine } from "@/lib/scheduling/engine";
import type { SlotAvailability } from "@/lib/scheduling/types";
import type { MiniProfile } from "@/components/user-chip";
import type { AvailabilityStatus } from "@/lib/constants";

const SLOT_MINUTES = 30;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;

function buildSlots(
  blocks: { start_at: string; end_at: string; user_id: string; status: string }[],
  memberIds: string[],
): SlotAvailability[] {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);

  const slotMap = new Map<string, SlotAvailability>();

  let cursor = new Date(startDate);
  while (cursor < endDate) {
    const h = cursor.getHours();
    if (h >= DAY_START_HOUR && h < DAY_END_HOUR) {
      const end = new Date(cursor);
      end.setMinutes(end.getMinutes() + SLOT_MINUTES);
      const key = cursor.toISOString();
      slotMap.set(key, {
        start: cursor.toISOString(),
        end: end.toISOString(),
        participants: memberIds.map((id) => ({ userId: id, status: "free" as AvailabilityStatus })),
      });
    }
    cursor = new Date(cursor);
    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }

  for (const block of blocks) {
    const blockStart = new Date(block.start_at).getTime();
    const blockEnd = new Date(block.end_at).getTime();
    for (const [key, slot] of slotMap.entries()) {
      const slotStart = new Date(slot.start).getTime();
      const slotEnd = new Date(slot.end).getTime();
      if (slotStart >= blockStart && slotEnd <= blockEnd) {
        slot.participants = slot.participants.map((p) =>
          p.userId === block.user_id
            ? { ...p, status: block.status as AvailabilityStatus }
            : p,
        );
        slotMap.set(key, slot);
      }
    }
  }

  return Array.from(slotMap.values());
}

export function GroupScheduler({
  groupId,
  members,
  groupName,
}: {
  groupId: string;
  members: MiniProfile[];
  groupName: string;
}) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const memberIds = members.map((m) => m.id);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["group-availability", groupId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("availability_blocks")
        .select("user_id, start_at, end_at, status")
        .in("user_id", memberIds);
      return data ?? [];
    },
  });

  const profilesById = Object.fromEntries(members.map((m) => [m.id, m]));

  const slots = buildSlots(blocks, memberIds);
  const ranked = schedulingEngine.calculateAvailability({
    slots,
    participantCount: members.length,
  });

  return (
    <div className="flex flex-col gap-4">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="self-start">
          <Clock className="size-4" />
          Find a time
        </Button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing availability for the next 2 weeks
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground text-xs hover:underline"
            >
              Hide
            </button>
          </div>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading availability…</p>
          ) : (
            <AvailabilityGrid
              slots={ranked}
              participantCount={members.length}
              profilesById={profilesById}
              plannerTitle={groupName}
            />
          )}
        </div>
      )}
    </div>
  );
}
