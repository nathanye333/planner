import Link from "next/link";
import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventListItem } from "@/components/events/event-list-item";
import type { Tables } from "@/lib/types/database.types";

function partitionByTime(events: Tables<"events">[]) {
  const now = Date.now();
  const sorted = events.sort(
    (a, b) => +new Date(a.start_at) - +new Date(b.start_at),
  );
  const upcoming = sorted.filter((e) => +new Date(e.end_at) >= now);
  const past = sorted
    .filter((e) => +new Date(e.end_at) < now)
    .sort((a, b) => +new Date(b.start_at) - +new Date(a.start_at));
  return { upcoming, past };
}

export default async function EventsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: created }, { data: invitedRows }] = await Promise.all([
    supabase.from("events").select("*").eq("creator_id", profile.id),
    supabase
      .from("event_invites")
      .select("event:events(*)")
      .eq("user_id", profile.id),
  ]);

  const byId = new Map<string, Tables<"events">>();
  for (const e of created ?? []) byId.set(e.id, e);
  for (const row of invitedRows ?? []) {
    const e = row.event as Tables<"events"> | null;
    if (e) byId.set(e.id, e);
  }

  const { upcoming, past } = partitionByTime([...byId.values()]);

  return (
    <div>
      <PageHeader
        title="Events"
        description="Everything you're hosting or invited to."
        action={
          <Button asChild>
            <Link href="/events/new">
              <Plus className="size-4" />
              New event
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 flex flex-col gap-2">
          {upcoming.length > 0 ? (
            upcoming.map((e) => (
              <EventListItem key={e.id} event={e} timezone={profile.timezone} />
            ))
          ) : (
            <Empty />
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4 flex flex-col gap-2">
          {past.length > 0 ? (
            past.map((e) => (
              <EventListItem key={e.id} event={e} timezone={profile.timezone} />
            ))
          ) : (
            <Empty />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
      Nothing here yet.
    </p>
  );
}
