import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PlannerForm } from "@/components/planner/planner-form";
import type { MiniProfile } from "@/components/user-chip";

export default async function NewPlannerPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: friendsRaw } = await supabase
    .from("friendships")
    .select(
      "friend:profiles!friendships_friend_id_fkey(id, display_name, username, avatar_url)",
    )
    .eq("user_id", profile.id);

  const friends = (friendsRaw ?? [])
    .map((f) => f.friend as unknown as MiniProfile)
    .filter(Boolean);

  return (
    <div>
      <PageHeader
        title="New planner"
        description="Pick a date range and participants — we'll build the heatmap."
      />
      <Card>
        <CardContent>
          <PlannerForm friends={friends} />
        </CardContent>
      </Card>
    </div>
  );
}
