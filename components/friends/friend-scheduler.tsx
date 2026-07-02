"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AvailabilityGrid } from "@/components/planner/availability-grid";
import { schedulingEngine } from "@/lib/scheduling/engine";
import type { SlotAvailability } from "@/lib/scheduling/types";
import type { MiniProfile } from "@/components/user-chip";
import type { AvailabilityStatus } from "@/lib/constants";
import { createGroup, addGroupMember } from "@/lib/actions/groups";
import { useTimezone } from "@/components/timezone-provider";
import { offsetDateInTimezone } from "@/lib/timezone";

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
      slotMap.set(cursor.toISOString(), {
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

export function FriendScheduleButton({
  friend,
  currentUser,
}: {
  friend: MiniProfile;
  currentUser: MiniProfile;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();
  const timezone = useTimezone();
  const dateStart = offsetDateInTimezone(0, timezone);
  const dateEnd = offsetDateInTimezone(13, timezone);

  const members = [currentUser, friend];
  const memberIds = members.map((m) => m.id);
  const profilesById = Object.fromEntries(members.map((m) => [m.id, m]));

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["friend-availability", friend.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("availability_blocks")
        .select("user_id, start_at, end_at, status")
        .in("user_id", memberIds);
      return data ?? [];
    },
  });

  const slots = buildSlots(blocks, memberIds);
  const ranked = schedulingEngine.calculateAvailability({
    slots,
    participantCount: 2,
  });

  function handleScheduleGroup() {
    startTransition(async () => {
      const names = members.map((m) => m.display_name.split(" ")[0]).join(", ");
      const result = await createGroup({ name: names, description: null });
      if (!result.ok || !("data" in result) || !result.data) return;
      const groupId = result.data.id;
      await addGroupMember(groupId, friend.id);
      router.push(`/groups/${groupId}`);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Clock className="size-3.5" />
        Schedule
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Schedule with {friend.display_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Showing shared availability for the next 2 weeks.
            </p>

            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading availability…</p>
            ) : (
              <AvailabilityGrid
                slots={ranked}
                participantCount={2}
                profilesById={profilesById}
                plannerTitle={`with ${friend.display_name}`}
                slotMinutes={SLOT_MINUTES}
                dayStartHour={DAY_START_HOUR}
                dayEndHour={DAY_END_HOUR}
                dateStart={dateStart}
                dateEnd={dateEnd}
                timezone={timezone}
              />
            )}

            <div className="border-t pt-3">
              <p className="text-muted-foreground mb-2 text-xs">
                Want to include more people?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScheduleGroup}
                disabled={isPending}
              >
                {isPending ? "Creating group…" : "Create a group with " + friend.display_name}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
