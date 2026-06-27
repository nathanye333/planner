"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { plannerSchema } from "@/lib/validations/planner";
import { fail, ok, type ActionResult } from "./types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
}

export async function createPlanner(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const parsed = plannerSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const v = parsed.data;

  const plannerId = crypto.randomUUID();
  const { error } = await supabase
    .from("availability_planners")
    .insert({
      id: plannerId,
      creator_id: userId,
      title: v.title,
      date_start: v.date_start,
      date_end: v.date_end,
      day_start_hour: v.day_start_hour,
      day_end_hour: v.day_end_hour,
      slot_minutes: v.slot_minutes,
      group_id: v.group_id || null,
    })
  if (error) {
    return fail(error.message);
  }

  const ids = new Set(v.participant_ids ?? []);
  if (v.group_id) {
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", v.group_id);
    for (const m of members ?? []) ids.add(m.user_id);
  }
  ids.add(userId);

  await supabase.from("planner_participants").insert(
    [...ids].map((uid) => ({ planner_id: plannerId, user_id: uid })),
  );

  revalidatePath("/planners");
  return ok({ id: plannerId });
}

export async function deletePlanner(plannerId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("availability_planners")
    .delete()
    .eq("id", plannerId);
  if (error) return fail(error.message);
  revalidatePath("/planners");
  return ok();
}
