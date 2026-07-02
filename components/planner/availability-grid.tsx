"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventContentArg, EventHoveringArg } from "@fullcalendar/core";
import { CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlannerCalendarView } from "@/components/planner/planner-calendar-view";
import { AVAILABILITY_META, type AvailabilityStatus } from "@/lib/constants";
import type { RankedSlot } from "@/lib/scheduling/types";
import type { MiniProfile } from "@/components/user-chip";
import { formatDayInTimezone, formatTimeInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const STATUS_ORDER: AvailabilityStatus[] = ["free", "tentative", "committed"];

function freeFraction(slot: RankedSlot, participantCount: number) {
  return participantCount > 0 ? slot.counts.free / participantCount : 0;
}

function heatmapColor(fraction: number) {
  if (fraction >= 1) return "var(--free)";
  const pct = Math.round(fraction * 100);
  return `color-mix(in oklab, var(--free) ${pct}%, var(--card))`;
}

export function AvailabilityGrid({
  slots,
  participantCount,
  profilesById,
  plannerTitle,
  slotMinutes,
  dayStartHour,
  dayEndHour,
  dateStart,
  dateEnd,
  timezone,
  groupId,
}: {
  slots: RankedSlot[];
  participantCount: number;
  profilesById: Record<string, MiniProfile>;
  plannerTitle: string;
  slotMinutes: number;
  dayStartHour: number;
  dayEndHour: number;
  dateStart: string;
  dateEnd: string;
  timezone: string;
  groupId?: string;
}) {
  const [hovered, setHovered] = useState<RankedSlot | null>(null);
  const [pinned, setPinned] = useState<RankedSlot | null>(null);
  const active = hovered ?? pinned;

  const best = useMemo(
    () =>
      [...slots]
        .sort((a, b) =>
          b.score !== a.score
            ? b.score - a.score
            : a.start.localeCompare(b.start),
        )
        .slice(0, 5),
    [slots],
  );

  const events = useMemo(
    () =>
      slots.map((slot) => {
        const color = heatmapColor(freeFraction(slot, participantCount));
        return {
          id: slot.start,
          start: slot.start,
          end: slot.end,
          display: "background" as const,
          backgroundColor: color,
          classNames: ["planner-heatmap"],
          extendedProps: { slot, heatmapColor: color },
        };
      }),
    [slots, participantCount],
  );

  const hasOverlap = best.length > 0 && best[0].score > 0;

  function slotFromEvent(arg: EventHoveringArg | EventContentArg) {
    return arg.event.extendedProps.slot as RankedSlot | undefined;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4" />
          Best times
        </h3>
        {!hasOverlap ? (
          <p className="text-muted-foreground text-sm">
            No overlapping availability yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {best.map((s) => (
              <button
                key={s.start}
                onClick={() => setPinned(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "hover:bg-accent flex flex-col items-start rounded-lg border px-3 py-2 text-left transition",
                  active?.start === s.start && "ring-primary ring-2",
                )}
              >
                <span className="text-sm font-medium">
                  {formatDayInTimezone(s.start, timezone)} ·{" "}
                  {formatTimeInTimezone(s.start, timezone)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {s.counts.free} free · {s.counts.tentative} maybe ·{" "}
                  {s.counts.committed} busy
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section
          className="flex min-w-0 flex-1 flex-col gap-3"
          onMouseLeave={() => setHovered(null)}
        >
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">0/{participantCount}</span>
            <div
              className="h-3 w-32 rounded-full border"
              style={{
                background:
                  "linear-gradient(to right, var(--card), var(--free))",
              }}
            />
            <span className="text-muted-foreground">
              {participantCount}/{participantCount} free
            </span>
          </div>

          <PlannerCalendarView
            events={events}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
            slotMinutes={slotMinutes}
            dateStart={dateStart}
            dateEnd={dateEnd}
            timezone={timezone}
            onEventMouseEnter={(arg) => {
              const slot = slotFromEvent(arg);
              if (slot) setHovered(slot);
            }}
            onEventMouseLeave={() => setHovered(null)}
            onEventClick={(arg) => {
              const slot = slotFromEvent(arg);
              if (slot) setPinned(slot);
            }}
            eventClassNames={(arg) =>
              slotFromEvent(arg)?.start === active?.start
                ? ["planner-slot-active"]
                : []
            }
          />
        </section>

        <aside className="lg:bg-card w-full shrink-0 lg:sticky lg:top-4 lg:w-72 lg:rounded-xl lg:border lg:p-4">
          {active ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {formatDayInTimezone(active.start, timezone)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {formatTimeInTimezone(active.start, timezone)} –{" "}
                  {formatTimeInTimezone(active.end, timezone)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                  <span className="bg-free size-2 rounded-full" />
                  {active.counts.free} free
                </span>
                <span className="flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                  <span className="bg-tentative size-2 rounded-full" />
                  {active.counts.tentative} tentative
                </span>
                <span className="flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                  <span className="bg-committed size-2 rounded-full" />
                  {active.counts.committed} busy
                </span>
              </div>

              {STATUS_ORDER.map((status) => {
                const people = active.participants.filter(
                  (p) => p.status === status,
                );
                if (people.length === 0) return null;
                return (
                  <div key={status} className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-xs font-medium">
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          AVAILABILITY_META[status].color,
                        )}
                      />
                      {AVAILABILITY_META[status].label} ({people.length})
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {people
                        .map(
                          (p) =>
                            profilesById[p.userId]?.display_name ?? "Someone",
                        )
                        .join(", ")}
                    </span>
                  </div>
                );
              })}

              <Button asChild>
                <Link
                  href={`/events/new?start=${encodeURIComponent(
                    active.start,
                  )}&end=${encodeURIComponent(
                    active.end,
                  )}&title=${encodeURIComponent(plannerTitle)}${
                    groupId ? `&group=${encodeURIComponent(groupId)}` : ""
                  }`}
                >
                  <CalendarPlus className="size-4" />
                  Create event at this time
                </Link>
              </Button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
