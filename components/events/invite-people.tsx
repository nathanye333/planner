"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserChip, type MiniProfile } from "@/components/user-chip";
import { inviteToEvent } from "@/lib/actions/events";

export function InvitePeople({
  eventId,
  candidates,
}: {
  eventId: string;
  candidates: MiniProfile[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await inviteToEvent(eventId, [...selected]);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invites sent");
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Everyone you can invite is already on the list.
          </p>
        ) : (
          <ScrollArea className="max-h-80 rounded-lg border">
            <ul className="flex flex-col">
              {candidates.map((c) => (
                <li key={c.id}>
                  <label className="hover:bg-accent flex cursor-pointer items-center gap-3 p-2.5">
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                    />
                    <UserChip profile={c} size="sm" />
                  </label>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button onClick={submit} disabled={pending || selected.size === 0}>
            {pending ? "Sending…" : `Invite ${selected.size || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
