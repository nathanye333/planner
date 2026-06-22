"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shield, ShieldOff, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserChip, type MiniProfile } from "@/components/user-chip";
import { ActionButton } from "@/components/action-button";
import {
  addGroupMember,
  leaveGroup,
  removeGroupMember,
  setGroupRole,
} from "@/lib/actions/groups";

export interface GroupMember {
  user_id: string;
  role: "admin" | "member";
  profile: MiniProfile;
}

export function GroupMembers({
  groupId,
  members,
  candidates,
  isAdmin,
  currentUserId,
}: {
  groupId: string;
  members: GroupMember[];
  candidates: MiniProfile[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function leave() {
    startTransition(async () => {
      const result = await leaveGroup(groupId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("You left the group");
      router.push("/groups");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Members ({members.length})</h3>
        <div className="flex gap-2">
          {isAdmin && (
            <AddMemberDialog groupId={groupId} candidates={candidates} />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={leave}
            disabled={pending}
          >
            Leave
          </Button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              <UserChip profile={m.profile} size="sm" />
              {m.role === "admin" && <Badge variant="secondary">Admin</Badge>}
              {m.user_id === currentUserId && (
                <Badge variant="outline">You</Badge>
              )}
            </div>

            {isAdmin && m.user_id !== currentUserId && (
              <div className="flex gap-1">
                {m.role === "member" ? (
                  <ActionButton
                    size="icon"
                    variant="ghost"
                    title="Make admin"
                    action={() => setGroupRole(groupId, m.user_id, "admin")}
                  >
                    <Shield className="size-4" />
                  </ActionButton>
                ) : (
                  <ActionButton
                    size="icon"
                    variant="ghost"
                    title="Remove admin"
                    action={() => setGroupRole(groupId, m.user_id, "member")}
                  >
                    <ShieldOff className="size-4" />
                  </ActionButton>
                )}
                <ActionButton
                  size="icon"
                  variant="ghost"
                  title="Remove from group"
                  action={() => removeGroupMember(groupId, m.user_id)}
                >
                  <UserMinus className="size-4" />
                </ActionButton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddMemberDialog({
  groupId,
  candidates,
}: {
  groupId: string;
  candidates: MiniProfile[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add friends to the group</DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            All of your friends are already in this group.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <UserChip profile={c} size="sm" />
                <ActionButton
                  size="sm"
                  action={() => addGroupMember(groupId, c.id)}
                  successMessage={`Added ${c.display_name}`}
                >
                  Add
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
