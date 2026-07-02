"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
}

export type BlockShareTarget = { type: "group" | "friend"; id: string };

/** Returns the groups/friends a block is currently shared with. */
export async function getBlockShares(blockId: string): Promise<BlockShareTarget[]> {
  const { supabase, userId } = await authed();
  if (!userId) return [];

  const { data } = await supabase
    .from("availability_block_shares")
    .select("recipient_type, recipient_id")
    .eq("block_id", blockId);
  return (data ?? []).map((r) => ({ type: r.recipient_type as "group" | "friend", id: r.recipient_id }));
}

/** Reconciles a block's shares to exactly the given target set. */
export async function setBlockShares(
  blockId: string,
  targets: BlockShareTarget[],
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { error: deleteError } = await supabase
    .from("availability_block_shares")
    .delete()
    .eq("block_id", blockId);
  if (deleteError) return fail(deleteError.message);

  if (targets.length > 0) {
    const { error: insertError } = await supabase.from("availability_block_shares").insert(
      targets.map((t) => ({
        block_id: blockId,
        recipient_type: t.type,
        recipient_id: t.id,
      })),
    );
    if (insertError) return fail(insertError.message);
  }

  revalidatePath("/calendar");
  return ok();
}

/**
 * Adds the user's current groups as share recipients to every existing block
 * that doesn't already have them shared. Additive only — never removes or
 * narrows an existing share.
 */
export async function shareAllBlocksWithAllGroups(): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const [{ data: blocks, error: blocksError }, { data: memberships, error: groupsError }] =
    await Promise.all([
      supabase.from("availability_blocks").select("id").eq("user_id", userId),
      supabase.from("group_members").select("group_id").eq("user_id", userId),
    ]);
  if (blocksError) return fail(blocksError.message);
  if (groupsError) return fail(groupsError.message);

  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (!blocks || blocks.length === 0 || groupIds.length === 0) return ok();

  const rows = blocks.flatMap((b) =>
    groupIds.map((groupId) => ({
      block_id: b.id,
      recipient_type: "group" as const,
      recipient_id: groupId,
    })),
  );

  const { error } = await supabase
    .from("availability_block_shares")
    .upsert(rows, { onConflict: "block_id,recipient_type,recipient_id", ignoreDuplicates: true });
  if (error) return fail(error.message);

  revalidatePath("/calendar");
  return ok();
}

/**
 * Removes all group-type shares from every one of the user's blocks. The
 * inverse of shareAllBlocksWithAllGroups — does not touch friend shares.
 */
export async function unshareAllBlocksFromAllGroups(): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { data: blocks, error: blocksError } = await supabase
    .from("availability_blocks")
    .select("id")
    .eq("user_id", userId);
  if (blocksError) return fail(blocksError.message);
  if (!blocks || blocks.length === 0) return ok();

  const { error } = await supabase
    .from("availability_block_shares")
    .delete()
    .eq("recipient_type", "group")
    .in("block_id", blocks.map((b) => b.id));
  if (error) return fail(error.message);

  revalidatePath("/calendar");
  return ok();
}

export async function setAvailabilityMode(
  mode: "manual" | "auto_free",
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({ availability_mode: mode })
    .eq("id", userId);
  if (error) return fail(error.message);

  revalidatePath("/settings");
  return ok();
}
