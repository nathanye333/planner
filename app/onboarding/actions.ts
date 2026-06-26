"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations/profile";

export type ActionResult = { error: string } | { ok: true };

export async function completeOnboarding(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    username: formData.get("username"),
    timezone: formData.get("timezone"),
    bio: formData.get("bio") ?? "",
    avatar_url: formData.get("avatar_url") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username } = parsed.data;
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { error: "That username is taken" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      username,
      timezone: parsed.data.timezone,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatar_url || null,
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/groups");
}
