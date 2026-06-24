"use client";

import { useState } from "react";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CalendarView } from "./calendar-view";
import { Button } from "@/components/ui/button";
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
  type AvailabilityStatus,
} from "@/lib/constants";
import type { Tables } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useTimezone } from "@/components/timezone-provider";

const STATUSES: AvailabilityStatus[] = ["free", "tentative", "committed"];

type Block = Tables<"availability_blocks">;

function toEvent(b: Block): EventInput {
  return {
    id: b.id,
    title: b.title ?? AVAILABILITY_META[b.status].label,
    start: b.start_at,
    end: b.end_at,
    classNames: [`status-${b.status}`],
    extendedProps: {
      status: b.status,
      source: b.source,
      isOverride: b.is_override,
    },
  };
}

export function AvailabilityEditor({ userId }: { userId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const [painter, setPainter] = useState<AvailabilityStatus>("committed");
  const [selected, setSelected] = useState<{
    id: string;
    status: AvailabilityStatus;
    source: string;
    start: string;
    end: string;
  } | null>(null);

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

  const createBlock = useMutation({
    mutationFn: async (arg: DateSelectArg) => {
      const { error } = await supabase.from("availability_blocks").insert({
        user_id: userId,
        start_at: new Date(arg.startStr).toISOString(),
        end_at: new Date(arg.endStr).toISOString(),
        status: painter,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["availability", userId] }),
    onError: (e: Error) => toast.error(e.message),
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
      setSelected(null);
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
    createBlock.mutate(arg);
    arg.view.calendar.unselect();
  }

  function handleEventClick(arg: EventClickArg) {
    const props = arg.event.extendedProps as {
      status: AvailabilityStatus;
      source: string;
    };
    setSelected({
      id: arg.event.id,
      status: props.status,
      source: props.source,
      start: arg.event.startStr,
      end: arg.event.endStr,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">
          Drag on the calendar to mark time as:
        </span>
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
            <span className={cn("size-3 rounded-full", AVAILABILITY_META[s].color)} />
            {AVAILABILITY_META[s].label}
          </button>
        ))}
      </div>

      <CalendarView
        events={blocks.map(toEvent)}
        selectable
        onSelect={handleSelect}
        onEventClick={handleEventClick}
        timeZone={timezone}
      />

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

          <DialogFooter>
            {selected?.source === "manual" && (
              <Button
                variant="destructive"
                onClick={() => selected && deleteBlock.mutate(selected.id)}
              >
                Delete block
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
