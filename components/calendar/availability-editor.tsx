"use client";

import { useState } from "react";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CalendarView } from "./calendar-view";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AVAILABILITY_META,
  normalizeAvailabilityStatus,
  type AvailabilityStatus,
} from "@/lib/constants";
import type { Tables } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { utcIsoFromFullCalendar } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";
import { getBlockShares, setBlockShares, type BlockShareTarget } from "@/lib/actions/availability";

export type GroupShare = { id: string; name: string };

const STATUSES: AvailabilityStatus[] = ["free", "tentative", "committed"];

type Block = Tables<"availability_blocks">;

function toEvent(b: Block): EventInput {
  const status = normalizeAvailabilityStatus(b.status);
  const meta = AVAILABILITY_META[status];
  return {
    id: b.id,
    title: b.title ?? meta.label,
    start: b.start_at,
    end: b.end_at,
    classNames: [`status-${status}`],
    extendedProps: {
      status: b.status,
      source: b.source,
      isOverride: b.is_override,
    },
  };
}

function shareKey(t: BlockShareTarget) {
  return `${t.type}:${t.id}`;
}

function SharePicker({
  groups,
  friends,
  selected,
  onToggle,
}: {
  groups: GroupShare[];
  friends: GroupShare[];
  selected: Set<string>;
  onToggle: (target: BlockShareTarget) => void;
}) {
  if (groups.length === 0 && friends.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        You&apos;re not in any groups or friends yet — this slot will be saved but not shared.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Share with groups:</p>
          {groups.map((g) => {
            const target: BlockShareTarget = { type: "group", id: g.id };
            return (
              <label
                key={shareKey(target)}
                className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-accent"
              >
                <Checkbox
                  checked={selected.has(shareKey(target))}
                  onCheckedChange={() => onToggle(target)}
                />
                <span className="text-sm">{g.name}</span>
              </label>
            );
          })}
        </div>
      )}
      {friends.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Share with friends:</p>
          {friends.map((f) => {
            const target: BlockShareTarget = { type: "friend", id: f.id };
            return (
              <label
                key={shareKey(target)}
                className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-accent"
              >
                <Checkbox
                  checked={selected.has(shareKey(target))}
                  onCheckedChange={() => onToggle(target)}
                />
                <span className="text-sm">{f.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AvailabilityEditor({
  userId,
  groups = [],
  friends = [],
}: {
  userId: string;
  groups?: GroupShare[];
  friends?: GroupShare[];
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const [painter, setPainter] = useState<AvailabilityStatus>("free");

  // New block creation state
  const [pendingSlot, setPendingSlot] = useState<DateSelectArg | null>(null);
  const [pendingShares, setPendingShares] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  // Edit existing block state
  const [selected, setSelected] = useState<{
    id: string;
    status: AvailabilityStatus;
    source: string;
    start: string;
    end: string;
  } | null>(null);
  const [editShares, setEditShares] = useState<Set<string>>(new Set());
  const [savingShares, setSavingShares] = useState(false);

  const { data: blocks = [] } = useQuery({
    queryKey: ["availability", userId],
    queryFn: async (): Promise<Block[]> => {
      const { data } = await supabase
        .from("availability_blocks")
        .select("*")
        .eq("user_id", userId)
        .order("start_at", { ascending: true })
        .limit(500);
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      source,
    }: {
      id: string;
      status: AvailabilityStatus;
      source: string;
    }) => {
      const { error } = await supabase
        .from("availability_blocks")
        .update({ status, is_override: source === "google" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_blocks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", userId] });
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSelect(arg: DateSelectArg) {
    setPendingSlot(arg);
    setPendingShares(new Set());
  }

  function targetsFromKeys(keys: Set<string>): BlockShareTarget[] {
    return [...keys].map((k) => {
      const [type, id] = k.split(":");
      return { type: type as "group" | "friend", id };
    });
  }

  async function confirmNewSlot() {
    if (!pendingSlot) return;
    setCreating(true);
    try {
      const { data: block, error } = await supabase
        .from("availability_blocks")
        .insert({
          user_id: userId,
          start_at: utcIsoFromFullCalendar(pendingSlot.start, timezone),
          end_at: utcIsoFromFullCalendar(pendingSlot.end, timezone),
          status: painter,
          source: "manual",
        })
        .select("id")
        .single();

      if (error || !block) throw error ?? new Error("Could not create block");

      if (pendingShares.size > 0) {
        const result = await setBlockShares(block.id, targetsFromKeys(pendingShares));
        if (!result.ok) throw new Error(result.error);
      }

      queryClient.invalidateQueries({ queryKey: ["availability", userId] });
      pendingSlot.view.calendar.unselect();
      setPendingSlot(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleEventClick(arg: EventClickArg) {
    const props = arg.event.extendedProps as {
      status: AvailabilityStatus;
      source: string;
    };
    const id = arg.event.id;
    setSelected({
      id,
      status: props.status,
      source: props.source,
      start: utcIsoFromFullCalendar(arg.event.start!, timezone),
      end: utcIsoFromFullCalendar(arg.event.end!, timezone),
    });
    const shares = await getBlockShares(id);
    setEditShares(new Set(shares.map(shareKey)));
  }

  function toggleTarget(setter: typeof setPendingShares) {
    return (target: BlockShareTarget) => {
      setter((prev) => {
        const next = new Set(prev);
        const key = shareKey(target);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };
  }

  async function saveEditShares() {
    if (!selected) return;
    setSavingShares(true);
    try {
      const result = await setBlockShares(selected.id, targetsFromKeys(editShares));
      if (!result.ok) throw new Error(result.error);
      toast.success("Sharing updated");
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingShares(false);
    }
  }

  // While the new-slot dialog is open, show a ghost event so the slot stays visible
  const ghostEvent: EventInput | null = pendingSlot
    ? {
        id: "__pending__",
        start: pendingSlot.start.toISOString(),
        end: pendingSlot.end.toISOString(),
        classNames: [`status-${painter}`, "opacity-60"],
        title: AVAILABILITY_META[painter].label,
        editable: false,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Mark time as:</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setPainter(s)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition",
              painter === s
                ? "border-foreground"
                : "border-transparent opacity-70 hover:opacity-100",
            )}
          >
            <span
              className={cn("size-3 rounded-full", AVAILABILITY_META[s].color)}
            />
            {AVAILABILITY_META[s].label}
          </button>
        ))}
      </div>

      <CalendarView
        events={[...blocks.map(toEvent), ...(ghostEvent ? [ghostEvent] : [])]}
        selectable
        onSelect={handleSelect}
        onEventClick={handleEventClick}
        timeZone={timezone}
      />

      {/* New block creation dialog */}
      <Dialog
        open={!!pendingSlot}
        onOpenChange={(open) => {
          if (!open) {
            pendingSlot?.view.calendar.unselect();
            setPendingSlot(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{AVAILABILITY_META[painter].label}</DialogTitle>
            {pendingSlot && (
              <DialogDescription>
                {formatDateTime(pendingSlot.start.toISOString(), timezone)} —{" "}
                {formatDateTime(pendingSlot.end.toISOString(), timezone)}
              </DialogDescription>
            )}
          </DialogHeader>

          <SharePicker
            groups={groups}
            friends={friends}
            selected={pendingShares}
            onToggle={toggleTarget(setPendingShares)}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                pendingSlot?.view.calendar.unselect();
                setPendingSlot(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmNewSlot} disabled={creating}>
              {creating ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit existing block dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update availability</DialogTitle>
            {selected && (
              <DialogDescription>
                {formatDateTime(selected.start, timezone)}
                {selected.source === "google" &&
                  " · synced from Google Calendar"}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                variant={selected?.status === s ? "default" : "outline"}
                className="flex-1"
                onClick={() =>
                  selected &&
                  updateStatus.mutate({
                    id: selected.id,
                    status: s,
                    source: selected.source,
                  })
                }
              >
                {AVAILABILITY_META[s].label}
              </Button>
            ))}
          </div>

          <SharePicker
            groups={groups}
            friends={friends}
            selected={editShares}
            onToggle={toggleTarget(setEditShares)}
          />

          <DialogFooter>
            {selected?.source === "manual" && (
              <Button
                variant="destructive"
                onClick={() => selected && deleteBlock.mutate(selected.id)}
              >
                Delete block
              </Button>
            )}
            <Button onClick={saveEditShares} disabled={savingShares}>
              {savingShares ? "Saving…" : "Save sharing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
