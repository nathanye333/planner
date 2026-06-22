"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RSVP_META, type RsvpStatus } from "@/lib/constants";
import { setRsvp } from "@/lib/actions/events";
import { cn } from "@/lib/utils";

const ORDER: RsvpStatus[] = ["committed", "tentative", "declined"];

export function RsvpButtons({
  eventId,
  current,
}: {
  eventId: string;
  current: RsvpStatus | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(status: RsvpStatus) {
    startTransition(async () => {
      const result = await setRsvp(eventId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {ORDER.map((s) => (
        <Button
          key={s}
          variant={current === s ? "default" : "outline"}
          disabled={pending}
          onClick={() => choose(s)}
          className="flex-1"
        >
          <span
            className={cn("mr-1.5 size-2 rounded-full", RSVP_META[s].color)}
          />
          {RSVP_META[s].label}
        </Button>
      ))}
    </div>
  );
}
