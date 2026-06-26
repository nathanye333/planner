"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setAutoShare } from "@/lib/actions/availability";

export function AutoShareToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle(checked: boolean) {
    startTransition(async () => {
      const result = await setAutoShare(checked);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Auto-share availability with all friends</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          Not recommended — share per-group or per-friend instead for better privacy.
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} />
    </div>
  );
}
