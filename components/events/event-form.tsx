"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserChip, type MiniProfile } from "@/components/user-chip";
import { VISIBILITY_META, type Visibility } from "@/lib/constants";
import { createEvent, updateEvent } from "@/lib/actions/events";

const VISIBILITIES: Visibility[] = ["private", "friends", "group", "public"];

export interface EventFormDefaults {
  title: string;
  description: string;
  location: string;
  start_at: string; // datetime-local string
  end_at: string;
  visibility: Visibility;
  group_id: string;
}

export function EventForm({
  userId,
  friends,
  groups,
  mode,
  eventId,
  defaults,
  defaultIsProposal = false,
  onSuccess,
  lockedGroup,
}: {
  userId: string;
  friends: MiniProfile[];
  groups: { id: string; name: string }[];
  mode: "create" | "edit";
  eventId?: string;
  defaults: EventFormDefaults;
  defaultIsProposal?: boolean;
  /** When provided, called with the event id on success instead of navigating. */
  onSuccess?: (eventId: string) => void;
  /** When provided, visibility is fixed to this group and not editable. */
  lockedGroup?: { id: string; name: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [visibility, setVisibility] = useState<Visibility>(
    lockedGroup ? "group" : defaults.visibility,
  );
  const [groupId, setGroupId] = useState(lockedGroup ? lockedGroup.id : defaults.group_id);
  const [invitees, setInvitees] = useState<Set<string>>(new Set());
  const [isProposal, setIsProposal] = useState(defaultIsProposal);
  const [lockMode, setLockMode] = useState<"threshold" | "manual">("manual");

  function toggleInvitee(id: string) {
    setInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    const thresholdRaw = formData.get("threshold_count");
    const input = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      start_at: String(formData.get("start_at") ?? ""),
      end_at: String(formData.get("end_at") ?? ""),
      visibility,
      group_id: visibility === "group" ? groupId : "",
      invitee_ids: [...invitees],
      is_proposal: isProposal,
      lock_mode: isProposal ? lockMode : undefined,
      threshold_count:
        isProposal && lockMode === "threshold" && thresholdRaw
          ? Number(thresholdRaw)
          : undefined,
      voting_deadline: isProposal
        ? String(formData.get("voting_deadline") ?? "")
        : "",
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEvent(input)
          : await updateEvent(eventId!, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Event created" : "Event updated");
      if (mode === "create" && "data" in result && result.data) {
        if (onSuccess) {
          onSuccess(result.data.id);
        } else {
          router.push(`/events/${result.data.id}`);
        }
      } else {
        router.push(`/events/${eventId}`);
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaults.title}
          placeholder="Friday dinner"
          required
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="start_at">Starts</Label>
          <Input
            id="start_at"
            name="start_at"
            type="datetime-local"
            defaultValue={defaults.start_at}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end_at">Ends</Label>
          <Input
            id="end_at"
            name="end_at"
            type="datetime-local"
            defaultValue={defaults.end_at}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          defaultValue={defaults.location}
          placeholder="123 Main St"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaults.description}
          rows={3}
        />
      </div>

      {lockedGroup ? (
        <div className="grid gap-2">
          <Label>Group</Label>
          <p className="text-sm">{lockedGroup.name}</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as Visibility)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {VISIBILITY_META[v].label} — {VISIBILITY_META[v].description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visibility === "group" && (
            <div className="grid gap-2">
              <Label>Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {mode === "create" && !lockedGroup && friends.length > 0 && (
        <div className="grid gap-2">
          <Label>Invite friends</Label>
          <ScrollArea className="max-h-48 rounded-lg border">
            <ul className="flex flex-col">
              {friends.map((f) => (
                <li key={f.id}>
                  <label className="hover:bg-accent flex cursor-pointer items-center gap-3 p-2.5">
                    <Checkbox
                      checked={invitees.has(f.id)}
                      onCheckedChange={() => toggleInvitee(f.id)}
                    />
                    <UserChip profile={f} size="sm" />
                  </label>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Propose this event</p>
              <p className="text-muted-foreground text-xs">
                Let invitees vote before the event is confirmed
              </p>
            </div>
            <Switch
              checked={isProposal}
              onCheckedChange={setIsProposal}
            />
          </div>

          {isProposal && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label>Lock-in mode</Label>
                <Select
                  value={lockMode}
                  onValueChange={(v) => setLockMode(v as "threshold" | "manual")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      Creator confirms — you decide when enough people voted
                    </SelectItem>
                    <SelectItem value="threshold">
                      Auto-confirm — locks in when a minimum headcount is reached
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {lockMode === "threshold" && (
                <div className="grid gap-2">
                  <Label htmlFor="threshold_count">Minimum people needed</Label>
                  <Input
                    id="threshold_count"
                    name="threshold_count"
                    type="number"
                    min={2}
                    placeholder="e.g. 5"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="voting_deadline">
                  Voting deadline{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="voting_deadline"
                  name="voting_deadline"
                  type="datetime-local"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending
          ? "Saving…"
          : mode === "create"
            ? isProposal
              ? "Propose event"
              : "Create event"
            : "Save changes"}
      </Button>
    </form>
  );
}
