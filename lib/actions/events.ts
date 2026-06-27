"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventSchema } from "@/lib/validations/event";
import { localInputToIso } from "@/lib/timezone";
import { fail, ok, type ActionResult } from "./types";
import type { AvailabilityStatus, RsvpStatus } from "@/lib/constants";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
}

/** The signed-in user's profile timezone; datetime-local inputs are entered in it. */
async function userTimezone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  return data?.timezone ?? "UTC";
}

function availabilityStatusFromRsvp(
  status: RsvpStatus,
): AvailabilityStatus | null {
  if (status === "declined") return null;
  return status;
}

function eventExternalId(eventId: string) {
  return `event-rsvp:${eventId}`;
}

async function revalidatePlannersForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  revalidatePath("/planners");
  const { data: planners } = await supabase
    .from("planner_participants")
    .select("planner_id")
    .eq("user_id", userId);
  for (const p of planners ?? []) {
    revalidatePath(`/planners/${p.planner_id}`);
  }
}

async function syncEventAvailabilityForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventId: string,
  status: RsvpStatus,
  startAt: string,
  endAt: string,
): Promise<ActionResult> {
  const availabilityStatus = availabilityStatusFromRsvp(status);
  const externalId = eventExternalId(eventId);

  const { error: clearError } = await supabase
    .from("availability_blocks")
    .delete()
    .eq("user_id", userId)
    .eq("source", "manual")
    .eq("external_id", externalId);
  if (clearError) return fail(clearError.message);
  if (!availabilityStatus) return ok();

  const { error } = await supabase.from("availability_blocks").insert({
    user_id: userId,
    start_at: startAt,
    end_at: endAt,
    status: availabilityStatus,
    source: "manual",
    external_id: externalId,
  });
  if (error) return fail(error.message);
  return ok();
}

export async function createEvent(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const v = parsed.data;
  const tz = await userTimezone(supabase, userId);
  const startAt = localInputToIso(v.start_at, tz);
  const endAt = localInputToIso(v.end_at, tz);

  const eventId = crypto.randomUUID();
  const { error } = await supabase
    .from("events")
    .insert({
      id: eventId,
      creator_id: userId,
      title: v.title,
      description: v.description || null,
      location: v.location || null,
      start_at: new Date(v.start_at).toISOString(),
      end_at: new Date(v.end_at).toISOString(),
      visibility: v.visibility,
      group_id: v.visibility === "group" ? v.group_id || null : null,
      status: v.is_proposal ? "proposed" : "confirmed",
      lock_mode: v.is_proposal ? (v.lock_mode ?? null) : null,
      threshold_count: v.is_proposal && v.lock_mode === "threshold" ? (v.threshold_count ?? null) : null,
      voting_deadline: v.is_proposal && v.voting_deadline ? new Date(v.voting_deadline).toISOString() : null,
    })
  if (error) return fail(error.message);

  // Collect invitees: explicit picks plus, for group events, all group members.
  const inviteeIds = new Set(v.invitee_ids ?? []);
  if (v.visibility === "group" && v.group_id) {
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", v.group_id);
    for (const m of members ?? []) inviteeIds.add(m.user_id);
  }
  inviteeIds.delete(userId);

  if (inviteeIds.size > 0) {
    const { error: inviteError } = await supabase.from("event_invites").insert(
      [...inviteeIds].map((uid) => ({
        event_id: eventId,
        user_id: uid,
        invited_by: userId,
      })),
    );
    if (inviteError) return fail(inviteError.message);
  }

  // Creator is going by default.
  const { error: rsvpError } = await supabase
    .from("event_rsvps")
    .insert({ event_id: eventId, user_id: userId, status: "committed" });
  if (rsvpError) return fail(rsvpError.message);

  const syncResult = await syncEventAvailabilityForUser(
    supabase,
    userId,
    eventId,
    "committed",
    startAt,
    endAt,
  );
  if (!syncResult.ok) return syncResult;

  revalidatePath("/events");
  await revalidatePlannersForUser(supabase, userId);
  return ok({ id: eventId });
}

export async function updateEvent(
  eventId: string,
  input: unknown,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const v = parsed.data;

  const tz = await userTimezone(supabase, userId);
  const nextStartAt = localInputToIso(v.start_at, tz);
  const nextEndAt = localInputToIso(v.end_at, tz);
  const { error } = await supabase
    .from("events")
    .update({
      title: v.title,
      description: v.description || null,
      location: v.location || null,
      start_at: new Date(v.start_at).toISOString(),
      end_at: new Date(v.end_at).toISOString(),
      visibility: v.visibility,
      group_id: v.visibility === "group" ? v.group_id || null : null,
    })
    .eq("id", eventId);
  if (error) return fail(error.message);

  const { data: myRsvp } = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (myRsvp) {
    const syncResult = await syncEventAvailabilityForUser(
      supabase,
      userId,
      eventId,
      myRsvp.status,
      nextStartAt,
      nextEndAt,
    );
    if (!syncResult.ok) return syncResult;
  }
  revalidatePath(`/events/${eventId}`);
  return ok();
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const admin = createAdminClient();
  const { error: cleanupError } = await admin
    .from("availability_blocks")
    .delete()
    .eq("source", "manual")
    .eq("external_id", eventExternalId(eventId));
  if (cleanupError) return fail(cleanupError.message);
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return fail(error.message);
  revalidatePath("/events");
  return ok();
}

export async function setRsvp(
  eventId: string,
  status: RsvpStatus,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { data: event } = await supabase
    .from("events")
    .select("start_at, end_at")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return fail("Event not found");

  const { error } = await supabase
    .from("event_rsvps")
    .upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: "event_id,user_id" },
    );
  if (error) return fail(error.message);

  const syncResult = await syncEventAvailabilityForUser(
    supabase,
    userId,
    eventId,
    status,
    event.start_at,
    event.end_at,
  );
  if (!syncResult.ok) return syncResult;
  revalidatePath(`/events/${eventId}`);
  await revalidatePlannersForUser(supabase, userId);
  return ok();
}

export async function inviteToEvent(
  eventId: string,
  userIds: string[],
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  if (userIds.length === 0) return ok();
  const { error } = await supabase.from("event_invites").upsert(
    userIds.map((uid) => ({
      event_id: eventId,
      user_id: uid,
      invited_by: userId,
    })),
    { onConflict: "event_id,user_id" },
  );
  if (error) return fail(error.message);
  revalidatePath(`/events/${eventId}`);
  return ok();
}

export type ProposalVote = "yes" | "maybe" | "no";

export async function castVote(
  eventId: string,
  vote: ProposalVote,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  // Verify the caller is the creator or has been invited — prevents IDOR votes
  const { data: access } = await supabase
    .from("events")
    .select("creator_id, status, lock_mode, threshold_count")
    .eq("id", eventId)
    .single();

  if (!access) return fail("Event not found");
  if (access.status !== "proposed") return fail("Voting is not open for this event");

  if (access.creator_id !== userId) {
    const { data: invite } = await supabase
      .from("event_invites")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!invite) return fail("You are not invited to this event");
  }

  const { error } = await supabase.from("proposal_votes").upsert(
    { event_id: eventId, user_id: userId, vote, updated_at: new Date().toISOString() },
    { onConflict: "event_id,user_id" },
  );
  if (error) return fail(error.message);

  // Check threshold auto-lock after each vote
  if (access.lock_mode === "threshold" && access.threshold_count) {
    const { count } = await supabase
      .from("proposal_votes")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("vote", ["yes", "maybe"]);

    if ((count ?? 0) >= access.threshold_count) {
      await supabase
        .from("events")
        .update({ status: "confirmed" })
        .eq("id", eventId);
    }
  }

  revalidatePath(`/events/${eventId}`);
  return ok();
}

export async function confirmEvent(eventId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { data: event } = await supabase
    .from("events")
    .select("creator_id, status")
    .eq("id", eventId)
    .single();

  if (!event) return fail("Event not found");
  if (event.creator_id !== userId) return fail("Only the creator can confirm");
  if (event.status !== "proposed") return fail("Event is not in proposed state");

  const { error } = await supabase
    .from("events")
    .update({ status: "confirmed" })
    .eq("id", eventId);
  if (error) return fail(error.message);

  revalidatePath(`/events/${eventId}`);
  return ok();
}

export async function cancelProposal(eventId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { data: event } = await supabase
    .from("events")
    .select("creator_id")
    .eq("id", eventId)
    .single();

  if (!event) return fail("Event not found");
  if (event.creator_id !== userId) return fail("Only the creator can cancel");

  const { error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId);
  if (error) return fail(error.message);

  revalidatePath(`/events/${eventId}`);
  return ok();
}
