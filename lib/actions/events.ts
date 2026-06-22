"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventSchema } from "@/lib/validations/event";
import { fail, ok, type ActionResult } from "./types";
import type { RsvpStatus } from "@/lib/constants";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
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

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      creator_id: userId,
      title: v.title,
      description: v.description || null,
      location: v.location || null,
      cover_url: v.cover_url || null,
      start_at: new Date(v.start_at).toISOString(),
      end_at: new Date(v.end_at).toISOString(),
      visibility: v.visibility,
      group_id: v.visibility === "group" ? v.group_id || null : null,
    })
    .select("id")
    .single();
  if (error || !event) return fail(error?.message ?? "Could not create event");

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
    await supabase.from("event_invites").insert(
      [...inviteeIds].map((uid) => ({
        event_id: event.id,
        user_id: uid,
        invited_by: userId,
      })),
    );
  }

  // Creator is going by default.
  await supabase
    .from("event_rsvps")
    .insert({ event_id: event.id, user_id: userId, status: "committed" });

  revalidatePath("/events");
  return ok({ id: event.id });
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
  const { error } = await supabase
    .from("events")
    .update({
      title: v.title,
      description: v.description || null,
      location: v.location || null,
      cover_url: v.cover_url || null,
      start_at: new Date(v.start_at).toISOString(),
      end_at: new Date(v.end_at).toISOString(),
      visibility: v.visibility,
      group_id: v.visibility === "group" ? v.group_id || null : null,
    })
    .eq("id", eventId);
  if (error) return fail(error.message);
  revalidatePath(`/events/${eventId}`);
  return ok();
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
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
  const { error } = await supabase
    .from("event_rsvps")
    .upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: "event_id,user_id" },
    );
  if (error) return fail(error.message);
  revalidatePath(`/events/${eventId}`);
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
