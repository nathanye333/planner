import { notFound, redirect } from "next/navigation";
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

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();
  if (event.creator_id !== profile.id) redirect(`/events/${eventId}`);

  const { data: groupsRaw } = await supabase
    .from("group_members")
    .select("group:groups(id, name)")
    .eq("user_id", profile.id);
  const groups = (groupsRaw ?? [])
    .map((g) => g.group as { id: string; name: string } | null)
    .filter((g): g is { id: string; name: string } => !!g);

  const defaults: EventFormDefaults = {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    cover_url: event.cover_url,
    start_at: toLocalInput(event.start_at),
    end_at: toLocalInput(event.end_at),
    visibility: event.visibility as Visibility,
    group_id: event.group_id ?? "",
  };

  return (
    <div>
      <PageHeader title="Edit event" />
      <Card>
        <CardContent>
          <EventForm
            userId={profile.id}
            friends={[] as MiniProfile[]}
            groups={groups}
            mode="edit"
            eventId={eventId}
            defaults={defaults}
          />
        </CardContent>
      </Card>
    </div>
  );
}
