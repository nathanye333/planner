"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CoverUpload } from "@/components/cover-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  cover_url: string | null;
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
}: {
  userId: string;
  friends: MiniProfile[];
  groups: { id: string; name: string }[];
  mode: "create" | "edit";
  eventId?: string;
  defaults: EventFormDefaults;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [cover, setCover] = useState<string | null>(defaults.cover_url);
  const [visibility, setVisibility] = useState<Visibility>(defaults.visibility);
  const [groupId, setGroupId] = useState(defaults.group_id);
  const [invitees, setInvitees] = useState<Set<string>>(new Set());

  function toggleInvitee(id: string) {
    setInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    const input = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      cover_url: cover ?? "",
      start_at: String(formData.get("start_at") ?? ""),
      end_at: String(formData.get("end_at") ?? ""),
      visibility,
      group_id: visibility === "group" ? groupId : "",
      invitee_ids: [...invitees],
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
        router.push(`/events/${result.data.id}`);
      } else {
        router.push(`/events/${eventId}`);
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <CoverUpload userId={userId} value={cover} onChange={setCover} />

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
          placeholder="123 Main St, or a video link"
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

      {mode === "create" && friends.length > 0 && (
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

      <Button type="submit" disabled={pending} className="w-fit">
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create event"
            : "Save changes"}
      </Button>
    </form>
  );
}
