import type { Enums } from "@/lib/types/database.types";

export const APP_NAME = "Gather";

export type AvailabilityStatus = Enums<"availability_status">;
export type RsvpStatus = Enums<"rsvp_status">;
export type Visibility = Enums<"visibility">;

/** Availability scoring used by the planner heatmap. */
export const AVAILABILITY_SCORE: Record<AvailabilityStatus, number> = {
  committed: 0,
  tentative: 0.5,
  free: 1,
  open: 1,
};

export const AVAILABILITY_META: Record<
  AvailabilityStatus,
  { label: string; color: string; text: string }
> = {
  free: { label: "Free", color: "bg-free", text: "text-free" },
  tentative: {
    label: "Tentative",
    color: "bg-tentative",
    text: "text-tentative",
  },
  committed: { label: "Busy", color: "bg-committed", text: "text-committed" },
  open: { label: "Open slot", color: "bg-open", text: "text-open" },
};

/** Safe lookup for rows that may carry legacy or unexpected status values. */
export function normalizeAvailabilityStatus(
  status: string | null | undefined,
): AvailabilityStatus {
  if (status && status in AVAILABILITY_META) {
    return status as AvailabilityStatus;
  }
  return "committed";
}

export function getAvailabilityMeta(status: string | null | undefined) {
  return AVAILABILITY_META[normalizeAvailabilityStatus(status)];
}

export const RSVP_META: Record<RsvpStatus, { label: string; color: string }> = {
  committed: { label: "Going", color: "bg-free" },
  tentative: { label: "Maybe", color: "bg-tentative" },
  declined: { label: "Can't go", color: "bg-committed" },
};

export const VISIBILITY_META: Record<
  Visibility,
  { label: string; description: string }
> = {
  private: { label: "Private", description: "Only you and invitees" },
  friends: { label: "Friends", description: "Visible to your friends" },
  group: { label: "Group", description: "Visible to group members" },
  public: { label: "Public", description: "Anyone with the link" },
};

/** A curated, free-tier-friendly subset of IANA timezones. */
export const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;
