"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AVAILABILITY_META, type AvailabilityStatus } from "@/lib/constants";
import type { RankedSlot } from "@/lib/scheduling/types";
import type { MiniProfile } from "@/components/user-chip";
import { cn } from "@/lib/utils";

const STATUS_ORDER: AvailabilityStatus[] = ["free", "tentative", "committed"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}
function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}
function timeKey(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function AvailabilityGrid({
  slots,
  participantCount,
  profilesById,
  plannerTitle,
}: {
  slots: RankedSlot[];
  participantCount: number;
  profilesById: Record<string, MiniProfile>;
  plannerTitle: string;
}) {
  const [selected, setSelected] = useState<RankedSlot | null>(null);

  const { days, times, byCell } = useMemo(() => {
    const days: string[] = [];
    const times: string[] = [];
    const daySet = new Set<string>();
    const timeSet = new Set<string>();
    const byCell = new Map<string, RankedSlot>();
    for (const s of slots) {
      const dk = dayKey(s.start);
      const tk = timeKey(s.start);
      if (!daySet.has(dk)) {
        daySet.add(dk);
        days.push(dk);
      }
      if (!timeSet.has(tk)) {
        timeSet.add(tk);
        times.push(tk);
      }
      byCell.set(`${dk}|${tk}`, s);
    }
    return { days, times, byCell };
  }, [slots]);

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

  function cellColor(normalized: number) {
    const pct = Math.round(normalized * 100);
    return `color-mix(in oklab, var(--free) ${pct}%, var(--muted))`;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4" />
          Best times
        </h3>
        {best.length === 0 || best[0].score === 0 ? (
          <p className="text-muted-foreground text-sm">
            No overlapping availability yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {best.map((s) => (
              <button
                key={s.start}
                onClick={() => setSelected(s)}
                className="hover:bg-accent flex flex-col items-start rounded-lg border px-3 py-2 text-left"
              >
                <span className="text-sm font-medium">
                  {dayLabel(s.start)} · {timeLabel(s.start)}
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

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Less free</span>
          <div className="flex">
            {[0, 0.25, 0.5, 0.75, 1].map((n) => (
              <span
                key={n}
                className="size-4"
                style={{ backgroundColor: cellColor(n) }}
              />
            ))}
          </div>
          <span className="text-muted-foreground">All free</span>
        </div>

        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th className="w-14" />
                {days.map((d) => (
                  <th
                    key={d}
                    className="text-muted-foreground px-1 pb-1 text-xs font-medium"
                  >
                    {dayLabel(`${d}T00:00:00.000Z`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => (
                <tr key={t}>
                  <td className="text-muted-foreground pr-2 text-right align-middle text-[10px]">
                    {timeLabel(`2000-01-01T${t}:00.000Z`)}
                  </td>
                  {days.map((d) => {
                    const slot = byCell.get(`${d}|${t}`);
                    if (!slot) return <td key={d} />;
                    return (
                      <td key={d}>
                        <button
                          onClick={() => setSelected(slot)}
                          title={`${slot.counts.free}/${participantCount} free`}
                          className="size-6 rounded-sm border transition hover:ring-2"
                          style={{ backgroundColor: cellColor(slot.normalized) }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected && (
                <>
                  {dayLabel(selected.start)} · {timeLabel(selected.start)}–
                  {timeLabel(selected.end)}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="flex flex-col gap-4">
              {STATUS_ORDER.map((status) => {
                const people = selected.participants.filter(
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
                    selected.start,
                  )}&end=${encodeURIComponent(
                    selected.end,
                  )}&title=${encodeURIComponent(plannerTitle)}`}
                >
                  <CalendarPlus className="size-4" />
                  Create event at this time
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
