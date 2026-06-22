import type { AvailabilityStatus } from "@/lib/constants";

/** A participant's availability status for a single slot. */
export interface ParticipantStatus {
  userId: string;
  status: AvailabilityStatus;
}

/** Availability of all participants for a single time slot. */
export interface SlotAvailability {
  /** ISO start time of the slot. */
  start: string;
  /** ISO end time of the slot. */
  end: string;
  participants: ParticipantStatus[];
}

/** A slot enriched with an aggregate score and breakdown counts. */
export interface RankedSlot extends SlotAvailability {
  /** Sum of per-participant scores (committed 0, tentative 0.5, free 1). */
  score: number;
  /** Normalized 0..1 where 1 means everyone is free. */
  normalized: number;
  counts: Record<AvailabilityStatus, number>;
}

export interface AvailabilityInput {
  slots: SlotAvailability[];
  /** Total participant count, used for normalization. */
  participantCount: number;
}
