import type { AvailabilityStatus } from "@/lib/constants";
import type { AvailabilityInput, SlotAvailability } from "./types";

export interface PlannerWindow {
  date_start: string; // YYYY-MM-DD
  date_end: string;
  day_start_hour: number;
  day_end_hour: number;
  slot_minutes: number;
}

export interface UserBlock {
  user_id: string;
  start_at: string;
  end_at: string;
  status: AvailabilityStatus;
}

const RANK: Record<AvailabilityStatus, number> = {
  free: 0,
  tentative: 1,
  committed: 2,
};

/**
 * Builds the slot grid for a planner and resolves each participant's status
 * per slot from their availability blocks. Absence of a block means FREE.
 * When multiple blocks overlap a slot, the busiest status wins.
 *
 * Slots are computed in UTC for determinism; the UI renders times in the
 * viewer's locale.
 */
export function buildAvailabilityInput(
  planner: PlannerWindow,
  participantIds: string[],
  blocks: UserBlock[],
): AvailabilityInput {
  const byUser = new Map<string, UserBlock[]>();
  for (const b of blocks) {
    const list = byUser.get(b.user_id) ?? [];
    list.push(b);
    byUser.set(b.user_id, list);
  }

  const slotMs = planner.slot_minutes * 60_000;
  const slots: SlotAvailability[] = [];

  const [sy, sm, sd] = planner.date_start.split("-").map(Number);
  const [ey, em, ed] = planner.date_end.split("-").map(Number);
  let dayCursor = Date.UTC(sy, sm - 1, sd);
  const lastDay = Date.UTC(ey, em - 1, ed);

  while (dayCursor <= lastDay) {
    const day = new Date(dayCursor);
    for (
      let minute = planner.day_start_hour * 60;
      minute < planner.day_end_hour * 60;
      minute += planner.slot_minutes
    ) {
      const start = Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        0,
        minute,
      );
      const end = start + slotMs;

      const participants = participantIds.map((userId) => {
        const userBlocks = byUser.get(userId) ?? [];
        let status: AvailabilityStatus = "free";
        for (const b of userBlocks) {
          const bStart = new Date(b.start_at).getTime();
          const bEnd = new Date(b.end_at).getTime();
          if (bStart < end && bEnd > start && RANK[b.status] > RANK[status]) {
            status = b.status;
          }
        }
        return { userId, status };
      });

      slots.push({
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        participants,
      });
    }
    dayCursor += 86_400_000;
  }

  return { slots, participantCount: participantIds.length };
}
