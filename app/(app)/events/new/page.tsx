import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  EventForm,
  type EventFormDefaults,
} from "@/components/events/event-form";
import type { MiniProfile } from "@/components/user-chip";
import type { Visibility } from "@/lib/constants";

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    start?: string;
    end?: string;
    title?: string;
  }>;
}) {
  const { group, start: startParam, end: endParam, title } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: friendsRaw }, { data: groupsRaw }] = await Promise.all([
    supabase
      .from("friendships")
      .select(
        "friend:profiles!friendships_friend_id_fkey(id, display_name, username, avatar_url)",
      )
      .eq("user_id", profile.id),
    supabase
      .from("group_members")
      .select("group:groups(id, name)")
      .eq("user_id", profile.id),
  ]);

  const friends = (friendsRaw ?? [])
    .map((f) => f.friend as unknown as MiniProfile)
    .filter(Boolean);
  const groups = (groupsRaw ?? [])
    .map((g) => g.group as { id: string; name: string } | null)
    .filter((g): g is { id: string; name: string } => !!g);

  const start = startParam ? new Date(startParam) : new Date();
  if (!startParam) start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = endParam ? new Date(endParam) : new Date(start);
  if (!endParam) end.setHours(end.getHours() + 2);

  const defaults: EventFormDefaults = {
    title: title ?? "",
    description: "",
    location: "",
    cover_url: null,
    start_at: toLocalInput(start),
    end_at: toLocalInput(end),
    visibility: (group ? "group" : "friends") as Visibility,
    group_id: group ?? "",
  };

  return (
    <div>
      <PageHeader title="New event" description="Host something memorable." />
      <Card>
        <CardContent>
          <EventForm
            userId={profile.id}
            friends={friends}
            groups={groups}
            mode="create"
            defaults={defaults}
          />
        </CardContent>
      </Card>
    </div>
  );
}
