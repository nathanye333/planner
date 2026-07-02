import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GroupDetailBody } from "@/components/groups/group-detail-body";
import type { GroupMember } from "@/components/groups/group-members";
import type { MiniProfile } from "@/components/user-chip";
import type { EventFormDefaults } from "@/components/events/event-form";
import { defaultEventInputs } from "@/lib/timezone";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) notFound();

  const [{ data: membersRaw }, { data: friendsRaw }, { data: events }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select(
          "user_id, role, profile:profiles(id, display_name, username, avatar_url)",
        )
        .eq("group_id", groupId),
      supabase
        .from("friendships")
        .select(
          "friend:profiles!friendships_friend_id_fkey(id, display_name, username, avatar_url)",
        )
        .eq("user_id", profile.id),
      supabase
        .from("events")
        .select("*")
        .eq("group_id", groupId)
        .order("start_at", { ascending: true }),
    ]);

  const members = (membersRaw ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    profile: m.profile as unknown as MiniProfile,
  })) as GroupMember[];

  const myMembership = members.find((m) => m.user_id === profile.id);
  const isAdmin = myMembership?.role === "admin";
  const memberIds = new Set(members.map((m) => m.user_id));

  const candidates = (friendsRaw ?? [])
    .map((f) => f.friend as unknown as MiniProfile)
    .filter((f) => f && !memberIds.has(f.id));

  const fallback = defaultEventInputs(profile.timezone);
  const eventDefaults: EventFormDefaults = {
    title: "",
    description: "",
    location: "",
    start_at: fallback.start,
    end_at: fallback.end,
    visibility: "group",
    group_id: group.id,
  };

  return (
    <GroupDetailBody
      group={{ id: group.id, name: group.name, description: group.description }}
      profileId={profile.id}
      timezone={profile.timezone}
      members={members}
      candidates={candidates}
      isAdmin={isAdmin}
      eventDefaults={eventDefaults}
      events={events ?? []}
    />
  );
}
