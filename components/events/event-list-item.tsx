import Link from "next/link";
import { CalendarRange, MapPin } from "lucide-react";
import type { Tables } from "@/lib/types/database.types";
import { formatDateTime } from "@/lib/format";
import { VisibilityBadge } from "./visibility-badge";

export function EventListItem({ event }: { event: Tables<"events"> }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-md">
        <CalendarRange className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.title}</p>
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>{formatDateTime(event.start_at)}</span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </p>
      </div>
      <VisibilityBadge visibility={event.visibility} />
    </Link>
  );
}
