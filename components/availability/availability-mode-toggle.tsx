"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAvailabilityMode } from "@/lib/actions/availability";
import { cn } from "@/lib/utils";

type AvailabilityMode = "manual" | "auto_free";

const OPTIONS: { value: AvailabilityMode; label: string; description: string }[] = [
  {
    value: "manual",
    label: "Manually select available times",
    description: "Only slots you explicitly mark are counted as available.",
  },
  {
    value: "auto_free",
    label: "Automatically mark free time as available",
    description: "Gaps with no blocks are counted as available in group planners.",
  },
];

export function AvailabilityModeToggle({ mode }: { mode: AvailabilityMode }) {
  const [pending, startTransition] = useTransition();

  function select(value: AvailabilityMode) {
    startTransition(async () => {
      const result = await setAvailabilityMode(value);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">How should your open time count in group planners?</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={mode === opt.value ? "default" : "outline"}
            disabled={pending}
            onClick={() => select(opt.value)}
            className={cn("h-auto flex-1 flex-col items-start gap-0.5 text-left whitespace-normal")}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span
              className={cn(
                "text-xs font-normal",
                mode === opt.value ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {opt.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
