"use client";

import { CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventForm, type EventFormDefaults } from "@/components/events/event-form";
import { GroupMembers, type GroupMember } from "@/components/groups/group-members";
import type { MiniProfile } from "@/components/user-chip";

/**
 * Group events auto-invite every group member (see createEvent), so this
 * form has no invitee picker of its own — it always passes an empty list.
 */
const NO_FRIENDS: MiniProfile[] = [];

export function NewGroupEventButton({
  creating,
  onOpen,
}: {
  creating: boolean;
  onOpen: () => void;
}) {
  if (creating) return null;
  return (
    <Button onClick={onOpen}>
      <CalendarPlus className="size-4" />
      New Group Event
    </Button>
  );
}

export function GroupSidePanel({
  groupId,
  groupName,
  userId,
  members,
  candidates,
  isAdmin,
  currentUserId,
  eventDefaults,
  creating,
  onCreatingChange,
}: {
  groupId: string;
  groupName: string;
  userId: string;
  members: GroupMember[];
  candidates: MiniProfile[];
  isAdmin: boolean;
  currentUserId: string;
  eventDefaults: EventFormDefaults;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
}) {
  if (!creating) {
    return (
      <GroupMembers
        groupId={groupId}
        members={members}
        candidates={candidates}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New group event</h3>
        <Button variant="ghost" size="icon" onClick={() => onCreatingChange(false)}>
          <X className="size-4" />
        </Button>
      </div>
      <EventForm
        userId={userId}
        friends={NO_FRIENDS}
        groups={[]}
        mode="create"
        defaults={eventDefaults}
        onSuccess={() => onCreatingChange(false)}
        lockedGroup={{ id: groupId, name: groupName }}
      />
    </div>
  );
}
