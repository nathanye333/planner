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

export async function sendFriendRequest(
  recipientId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  if (userId === recipientId) return fail("You can't friend yourself");

  // If they already requested you, accept that instead.
  const { data: reverse } = await supabase
    .from("friend_requests")
    .select("id, status")
    .eq("sender_id", recipientId)
    .eq("recipient_id", userId)
    .maybeSingle();
  if (reverse?.status === "pending") {
    const { error } = await supabase.rpc("accept_friend_request", {
      request_id: reverse.id,
    });
    if (error) return fail(error.message);
    revalidatePath("/friends");
    return ok();
  }

  const { error } = await supabase
    .from("friend_requests")
    .upsert(
      { sender_id: userId, recipient_id: recipientId, status: "pending" },
      { onConflict: "sender_id,recipient_id" },
    );
  if (error) return fail(error.message);

  revalidatePath("/friends");
  return ok();
}

export async function acceptFriendRequest(
  requestId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase.rpc("accept_friend_request", {
    request_id: requestId,
  });
  if (error) return fail(error.message);
  revalidatePath("/friends");
  return ok();
}

export async function declineFriendRequest(
  requestId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId);
  if (error) return fail(error.message);
  revalidatePath("/friends");
  return ok();
}

export async function cancelFriendRequest(
  requestId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId);
  if (error) return fail(error.message);
  revalidatePath("/friends");
  return ok();
}

export async function removeFriend(friendId: string): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");
  const { error } = await supabase.rpc("remove_friend", {
    other_id: friendId,
  });
  if (error) return fail(error.message);
  revalidatePath("/friends");
  return ok();
}
