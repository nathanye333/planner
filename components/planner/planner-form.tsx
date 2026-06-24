"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createPlanner } from "@/lib/actions/planners";
import { offsetDateInTimezone } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number) {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function PlannerForm({ friends }: { friends: MiniProfile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timezone = useTimezone();

  const [dayStart, setDayStart] = useState("9");
  const [dayEnd, setDayEnd] = useState("21");
  const [slot, setSlot] = useState("30");
  const [participants, setParticipants] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    const input = {
      title: String(formData.get("title") ?? ""),
      date_start: String(formData.get("date_start") ?? ""),
      date_end: String(formData.get("date_end") ?? ""),
      day_start_hour: Number(dayStart),
      day_end_hour: Number(dayEnd),
      slot_minutes: Number(slot),
      participant_ids: [...participants],
    };
    startTransition(async () => {
      const result = await createPlanner(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Planner created");
      if (result.data) router.push(`/planners/${result.data.id}`);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">What are you planning?</Label>
        <Input
          id="title"
          name="title"
          placeholder="Team offsite"
          required
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="date_start">From</Label>
          <Input
            id="date_start"
            name="date_start"
            type="date"
            defaultValue={offsetDateInTimezone(0, timezone)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date_end">To</Label>
          <Input
            id="date_end"
            name="date_end"
            type="date"
            defaultValue={offsetDateInTimezone(6, timezone)}
            required
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Day starts</Label>
          <Select value={dayStart} onValueChange={setDayStart}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {hourLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Day ends</Label>
          <Select value={dayEnd} onValueChange={setDayEnd}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.filter((h) => h > 0).map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {hourLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Slot size</Label>
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {friends.length > 0 && (
        <div className="grid gap-2">
          <Label>Participants (you&apos;re included automatically)</Label>
          <ScrollArea className="max-h-48 rounded-lg border">
            <ul className="flex flex-col">
              {friends.map((f) => (
                <li key={f.id}>
                  <label className="hover:bg-accent flex cursor-pointer items-center gap-3 p-2.5">
                    <Checkbox
                      checked={participants.has(f.id)}
                      onCheckedChange={() => toggle(f.id)}
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
        {pending ? "Creating…" : "Create planner"}
      </Button>
    </form>
  );
}
