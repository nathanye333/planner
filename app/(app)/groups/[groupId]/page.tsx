import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventListItem } from "@/components/events/event-list-item";
import { GroupCalendar } from "@/components/calendar/group-calendar";
import {
  GroupMembers,
  type GroupMember,
} from "@/components/groups/group-members";
import type { MiniProfile } from "@/components/user-chip";

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

  return (
    <div>
      <PageHeader
        title={group.name}
        description={group.description ?? undefined}
        action={
          <Button asChild>
            <Link href={`/events/new?group=${group.id}`}>
              <CalendarRange className="size-4" />
              New group event
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shared calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <GroupCalendar
                groupId={group.id}
                userId={profile.id}
                timezone={profile.timezone}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group events</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {events && events.length > 0 ? (
                events.map((e) => (
                  <EventListItem
                    key={e.id}
                    event={e}
                    timezone={profile.timezone}
                  />
                ))
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No events yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <GroupMembers
              groupId={group.id}
              members={members}
              candidates={candidates}
              isAdmin={isAdmin}
              currentUserId={profile.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
