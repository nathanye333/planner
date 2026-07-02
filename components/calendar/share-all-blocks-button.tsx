"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Share2, Slash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  shareAllBlocksWithAllGroups,
  unshareAllBlocksFromAllGroups,
} from "@/lib/actions/availability";

export function ShareAllBlocksButton() {
  const [sharePending, startShare] = useTransition();
  const [unsharePending, startUnshare] = useTransition();
  const queryClient = useQueryClient();
  const pending = sharePending || unsharePending;

  function share() {
    startShare(async () => {
      const result = await shareAllBlocksWithAllGroups();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Shared your calendar with all your groups");
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    });
  }

  function unshare() {
    startUnshare(async () => {
      const result = await unshareAllBlocksFromAllGroups();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Unshared your calendar from all your groups");
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={share} disabled={pending}>
        <Share2 className="size-4" />
        {sharePending ? "Sharing…" : "Share with all groups"}
      </Button>
      <Button variant="outline" onClick={unshare} disabled={pending}>
        <Slash className="size-4" />
        {unsharePending ? "Unsharing…" : "Unshare from all groups"}
      </Button>
    </div>
  );
}
