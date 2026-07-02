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
import { defaultEventInputs, isoToLocalInput } from "@/lib/timezone";

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

  const fallback = defaultEventInputs(profile.timezone);
  const startInput = startParam
    ? isoToLocalInput(startParam, profile.timezone)
    : fallback.start;
  const endInput = endParam
    ? isoToLocalInput(endParam, profile.timezone)
    : fallback.end;

  const defaults: EventFormDefaults = {
    title: title ?? "",
    description: "",
    location: "",
    start_at: startInput,
    end_at: endInput,
    visibility: (group ? "group" : "friends") as Visibility,
    group_id: group ?? "",
  };

  const defaultIsProposal = !!(group && startParam && endParam);

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
            defaultIsProposal={defaultIsProposal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
