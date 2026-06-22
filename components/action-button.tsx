"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/types";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Button that invokes a server action, showing loading state and toasting on
 * error / optional success message.
 */
export function ActionButton({
  action,
  successMessage,
  children,
  pendingChildren,
  ...props
}: {
  action: () => Promise<ActionResult>;
  successMessage?: string;
  pendingChildren?: React.ReactNode;
} & Omit<ButtonProps, "onClick">) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <Button onClick={run} disabled={pending || props.disabled} {...props}>
      {pending && pendingChildren ? pendingChildren : children}
    </Button>
  );
}
