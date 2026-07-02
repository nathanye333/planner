"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventListItem } from "@/components/events/event-list-item";
import { GroupCalendar } from "@/components/calendar/group-calendar";
import { GroupScheduler } from "@/components/groups/group-scheduler";
import { NewGroupEventButton, GroupSidePanel } from "@/components/groups/group-side-panel";
import type { GroupMember } from "@/components/groups/group-members";
import type { MiniProfile } from "@/components/user-chip";
import type { EventFormDefaults } from "@/components/events/event-form";
import type { Tables } from "@/lib/types/database.types";

export function GroupDetailBody({
  group,
  profileId,
  timezone,
  members,
  candidates,
  isAdmin,
  eventDefaults,
  events,
}: {
  group: { id: string; name: string; description: string | null };
  profileId: string;
  timezone: string;
  members: GroupMember[];
  candidates: MiniProfile[];
  isAdmin: boolean;
  eventDefaults: EventFormDefaults;
  events: Tables<"events">[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title={group.name}
        description={group.description ?? undefined}
        action={<NewGroupEventButton creating={creating} onOpen={() => setCreating(true)} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card className="border-0 shadow-none">
            <CardContent className="flex flex-col gap-4 px-0">
              <GroupCalendar groupId={group.id} userId={profileId} timezone={timezone} />
              <GroupScheduler
                groupId={group.id}
                members={members.map((m) => m.profile)}
                groupName={group.name}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group events</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {events.length > 0 ? (
                events.map((e) => (
                  <EventListItem key={e.id} event={e} timezone={timezone} />
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
            <GroupSidePanel
              groupId={group.id}
              groupName={group.name}
              userId={profileId}
              members={members}
              candidates={candidates}
              isAdmin={isAdmin}
              currentUserId={profileId}
              eventDefaults={eventDefaults}
              creating={creating}
              onCreatingChange={setCreating}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
