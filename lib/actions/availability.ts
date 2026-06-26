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

export async function shareAvailability(
  recipientType: "friend" | "group",
  recipientId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { error } = await supabase.from("availability_shares").upsert(
    { owner_id: userId, recipient_type: recipientType, recipient_id: recipientId },
    { onConflict: "owner_id,recipient_type,recipient_id" },
  );
  if (error) return fail(error.message);

  if (recipientType === "group") revalidatePath(`/groups/${recipientId}`);
  return ok();
}

export async function unshareAvailability(
  recipientType: "friend" | "group",
  recipientId: string,
): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { error } = await supabase
    .from("availability_shares")
    .delete()
    .eq("owner_id", userId)
    .eq("recipient_type", recipientType)
    .eq("recipient_id", recipientId);
  if (error) return fail(error.message);

  if (recipientType === "group") revalidatePath(`/groups/${recipientId}`);
  return ok();
}

export async function getShareStatus(
  recipientType: "friend" | "group",
  recipientId: string,
): Promise<boolean> {
  const { supabase, userId } = await authed();
  if (!userId) return false;

  const { data } = await supabase
    .from("availability_shares")
    .select("id")
    .eq("owner_id", userId)
    .eq("recipient_type", recipientType)
    .eq("recipient_id", recipientId)
    .maybeSingle();
  return !!data;
}

export async function setAutoShare(enabled: boolean): Promise<ActionResult> {
  const { supabase, userId } = await authed();
  if (!userId) return fail("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({ auto_share_availability: enabled })
    .eq("id", userId);
  if (error) return fail(error.message);

  revalidatePath("/settings");
  return ok();
}
