import { AVAILABILITY_SCORE, type AvailabilityStatus } from "@/lib/constants";
import type {
  AvailabilityInput,
  RankedSlot,
  SlotAvailability,
} from "./types";

/**
 * Pluggable scheduling abstraction. The default implementation is a pure
 * heuristic; a future `AiSchedulingEngine` can implement the same interface
 * without touching call sites. No LLM is integrated yet.
 */
export interface SchedulingEngine {
  /** Score each slot from raw participant availability. */
  calculateAvailability(input: AvailabilityInput): RankedSlot[];
  /** Sort scored slots best-first (ties broken by earlier start). */
  rankTimeSlots(slots: RankedSlot[]): RankedSlot[];
  /** Convenience: calculate + rank, returning the top `limit` slots. */
  suggestBestTimes(input: AvailabilityInput, limit?: number): RankedSlot[];
}

function emptyCounts(): Record<AvailabilityStatus, number> {
  return { committed: 0, tentative: 0, free: 0 };
}

export class HeuristicSchedulingEngine implements SchedulingEngine {
  calculateAvailability(input: AvailabilityInput): RankedSlot[] {
    const { participantCount } = input;
    const maxScore = Math.max(participantCount, 1);

    return input.slots.map((slot: SlotAvailability): RankedSlot => {
      const counts = emptyCounts();
      let score = 0;
      for (const p of slot.participants) {
        counts[p.status] += 1;
        score += AVAILABILITY_SCORE[p.status];
      }
      return {
        ...slot,
        score,
        normalized: score / maxScore,
        counts,
      };
    });
  }

  rankTimeSlots(slots: RankedSlot[]): RankedSlot[] {
    return [...slots].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.start.localeCompare(b.start);
    });
  }

  suggestBestTimes(input: AvailabilityInput, limit = 5): RankedSlot[] {
    return this.rankTimeSlots(this.calculateAvailability(input)).slice(0, limit);
  }
}

/** Default singleton engine used across the app. */
export const schedulingEngine: SchedulingEngine = new HeuristicSchedulingEngine();
