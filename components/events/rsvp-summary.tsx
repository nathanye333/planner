import { RSVP_META, type RsvpStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function RsvpSummary({
  counts,
}: {
  counts: Record<RsvpStatus, number>;
}) {
  const order: RsvpStatus[] = ["committed", "tentative", "declined"];
  return (
    <div className="flex gap-4">
      {order.map((s) => (
        <div key={s} className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", RSVP_META[s].color)} />
          <span className="text-sm">
            <span className="font-semibold">{counts[s]}</span>{" "}
            <span className="text-muted-foreground">{RSVP_META[s].label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
