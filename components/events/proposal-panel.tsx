"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, Minus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { castVote, confirmEvent, cancelProposal, type ProposalVote } from "@/lib/actions/events";
import { cn } from "@/lib/utils";

interface VoteCounts {
  yes: number;
  maybe: number;
  no: number;
}

export function ProposalPanel({
  eventId,
  myVote,
  voteCounts,
  isCreator,
  lockMode,
  thresholdCount,
  votingDeadline,
}: {
  eventId: string;
  myVote: ProposalVote | null;
  voteCounts: VoteCounts;
  isCreator: boolean;
  lockMode: "threshold" | "manual" | null;
  thresholdCount: number | null;
  votingDeadline: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const total = voteCounts.yes + voteCounts.maybe + voteCounts.no;
  const positive = voteCounts.yes + voteCounts.maybe;

  function vote(v: ProposalVote) {
    startTransition(async () => {
      const result = await castVote(eventId, v);
      if (!result.ok) { toast.error(result.error); return; }
      router.refresh();
    });
  }

  function confirm() {
    startTransition(async () => {
      const result = await confirmEvent(eventId);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Event confirmed!");
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelProposal(eventId);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Proposal cancelled.");
      router.refresh();
    });
  }

  const VOTES: { value: ProposalVote; label: string; Icon: typeof ThumbsUp }[] = [
    { value: "yes", label: "Yes", Icon: ThumbsUp },
    { value: "maybe", label: "Maybe", Icon: Minus },
    { value: "no", label: "No", Icon: ThumbsDown },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
          Proposed
        </Badge>
        {votingDeadline && (
          <span className="text-muted-foreground text-xs">
            Voting closes {new Date(votingDeadline).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {VOTES.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={myVote === value ? "default" : "outline"}
            disabled={pending}
            onClick={() => vote(value)}
            className="flex-1"
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1 overflow-hidden rounded-full">
            {voteCounts.yes > 0 && (
              <div
                className="h-2 bg-green-500 rounded-full"
                style={{ width: `${(voteCounts.yes / total) * 100}%` }}
              />
            )}
            {voteCounts.maybe > 0 && (
              <div
                className="h-2 bg-amber-400 rounded-full"
                style={{ width: `${(voteCounts.maybe / total) * 100}%` }}
              />
            )}
            {voteCounts.no > 0 && (
              <div
                className="h-2 bg-red-400 rounded-full"
                style={{ width: `${(voteCounts.no / total) * 100}%` }}
              />
            )}
          </div>
          <div className="text-muted-foreground flex gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-green-500 inline-block" />
              {voteCounts.yes} yes
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-400 inline-block" />
              {voteCounts.maybe} maybe
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400 inline-block" />
              {voteCounts.no} no
            </span>
          </div>
          {lockMode === "threshold" && thresholdCount && (
            <p className={cn("text-xs", positive >= thresholdCount ? "text-green-600" : "text-muted-foreground")}>
              {positive} of {thresholdCount} needed to confirm
            </p>
          )}
        </div>
      )}

      {isCreator && lockMode === "manual" && (
        <div className="flex gap-2 border-t pt-3">
          <Button size="sm" onClick={confirm} disabled={pending} className="gap-1.5">
            <CheckCircle className="size-4" />
            Confirm event
          </Button>
          <Button size="sm" variant="outline" onClick={cancel} disabled={pending} className="gap-1.5 text-destructive">
            <XCircle className="size-4" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
