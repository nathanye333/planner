import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded) redirect("/calendar");

  const suggestedName =
    profile?.display_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    "";
  const suggestedUsername = (user.email?.split("@")[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to {APP_NAME}</CardTitle>
          <CardDescription>
            Set up your profile so friends can find you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            userId={user.id}
            defaultName={suggestedName}
            defaultUsername={suggestedUsername}
            defaultAvatar={
              profile?.avatar_url ??
              (user.user_metadata?.avatar_url as string | undefined) ??
              null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
