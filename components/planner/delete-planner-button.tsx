"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePlanner } from "@/lib/actions/planners";

export function DeletePlannerButton({ plannerId }: { plannerId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    startTransition(async () => {
      const result = await deletePlanner(plannerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Planner deleted");
      router.push("/planners");
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={remove} disabled={pending}>
      <Trash2 className="size-5" />
    </Button>
  );
}
