import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AvailabilityEditor } from "@/components/calendar/availability-editor";
import type { GroupShare } from "@/components/calendar/availability-editor";
import { ShareAllBlocksButton } from "@/components/calendar/share-all-blocks-button";
import type { MiniProfile } from "@/components/user-chip";

type GroupRow = {
  role: string;
  group: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data }, { data: friendsRaw }] = await Promise.all([
    supabase
      .from("group_members")
      .select("role, group:groups(id, name, description)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("friendships")
      .select(
        "friend:profiles!friendships_friend_id_fkey(id, display_name, username, avatar_url)",
      )
      .eq("user_id", profile.id),
  ]);

  const groups = (data ?? []) as GroupRow[];

  const groupList: GroupShare[] = groups
    .filter((r) => r.group !== null)
    .map(({ group }) => ({ id: group!.id, name: group!.name }));

  const friendList: GroupShare[] = (friendsRaw ?? [])
    .map((f) => f.friend as unknown as MiniProfile)
    .filter(Boolean)
    .map((f) => ({ id: f.id, name: f.display_name }));

  return (
    <div>
      <PageHeader
        title="My Planner"
        description="Mark when you're free, tentative, or busy."
        action={<ShareAllBlocksButton />}
      />
      <AvailabilityEditor userId={profile.id} groups={groupList} friends={friendList} />
    </div>
  );
}
