"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { shareAvailability, unshareAvailability } from "@/lib/actions/availability";

export function AvailabilityShareToggle({
  recipientType,
  recipientId,
  isShared,
}: {
  recipientType: "friend" | "group";
  recipientId: string;
  isShared: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle(checked: boolean) {
    startTransition(async () => {
      const result = checked
        ? await shareAvailability(recipientType, recipientId)
        : await unshareAvailability(recipientType, recipientId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={isShared}
        onCheckedChange={toggle}
        disabled={pending}
      />
      <span className="text-sm">
        {isShared ? "Sharing your availability" : "Not sharing your availability"}
      </span>
    </div>
  );
}
