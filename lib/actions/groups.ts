"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { groupSchema } from "@/lib/validations/group";
import { fail, ok, type ActionResult } from "./types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
}

export async function createGroup(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return fail(error.message);

  revalidatePath("/groups");
  return ok({ id: data.id });
}

export async function updateGroup(
  groupId: string,
  input: unknown,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { error } = await supabase
    .from("groups")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", groupId);
  if (error) return fail(error.message);
  revalidatePath(`/groups/${groupId}`);
  return ok();
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return fail(error.message);
  revalidatePath("/groups");
  return ok();
}

export async function addGroupMember(
  groupId: string,
  memberId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("group_members")
    .upsert(
      { group_id: groupId, user_id: memberId, role: "member" },
      { onConflict: "group_id,user_id" },
    );
  if (error) return fail(error.message);
  revalidatePath(`/groups/${groupId}`);
  return ok();
}

export async function removeGroupMember(
  groupId: string,
  memberId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);
  if (error) return fail(error.message);
  revalidatePath(`/groups/${groupId}`);
  return ok();
}

export async function setGroupRole(
  groupId: string,
  memberId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", memberId);
  if (error) return fail(error.message);
  revalidatePath(`/groups/${groupId}`);
  return ok();
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return fail(error.message);
  revalidatePath("/groups");
  return ok();
}
