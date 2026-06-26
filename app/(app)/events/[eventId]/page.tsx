import { notFound } from "next/navigation";
import { CalendarClock, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisibilityBadge } from "@/components/events/visibility-badge";
import { RsvpButtons } from "@/components/events/rsvp-buttons";
import { RsvpSummary } from "@/components/events/rsvp-summary";
import { InvitePeople } from "@/components/events/invite-people";
import { EventAdminMenu } from "@/components/events/event-admin-menu";
import { EventComments } from "@/components/events/event-comments";
import { EventPhotos } from "@/components/events/event-photos";
import { ProposalPanel } from "@/components/events/proposal-panel";
import { UserChip, type MiniProfile } from "@/components/user-chip";
import { formatDateTime, initials } from "@/lib/format";
import type { RsvpStatus } from "@/lib/constants";
import type { ProposalVote } from "@/lib/actions/events";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "*, creator:profiles!events_creator_id_fkey(id, display_name, username, avatar_url)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const creator = event.creator as unknown as MiniProfile;
  const isCreator = event.creator_id === profile.id;

  const isProposed = event.status === "proposed";

  const [{ data: rsvps }, { data: invites }, { data: friendsRaw }, { data: votes }] =
    await Promise.all([
      supabase
        .from("event_rsvps")
        .select(
          "status, user_id, profile:profiles(id, display_name, username, avatar_url)",
        )
        .eq("event_id", eventId),
      supabase.from("event_invites").select("user_id").eq("event_id", eventId),
      supabase
        .from("friendships")
        .select(
          "friend:profiles!friendships_friend_id_fkey(id, display_name, username, avatar_url)",
        )
        .eq("user_id", profile.id),
      isProposed
        ? supabase.from("proposal_votes").select("user_id, vote").eq("event_id", eventId)
        : Promise.resolve({ data: [] }),
    ]);

  const voteCounts = { yes: 0, maybe: 0, no: 0 };
  let myVote: ProposalVote | null = null;
  for (const v of votes ?? []) {
    const voteVal = v.vote as ProposalVote;
    voteCounts[voteVal] += 1;
    if (v.user_id === profile.id) myVote = voteVal;
  }

  const counts: Record<RsvpStatus, number> = {
    committed: 0,
    tentative: 0,
    declined: 0,
  };
  let myStatus: RsvpStatus | null = null;
  const going: MiniProfile[] = [];
  for (const r of rsvps ?? []) {
    counts[r.status] += 1;
    if (r.user_id === profile.id) myStatus = r.status;
    if (r.status === "committed" && r.profile) {
      going.push(r.profile as unknown as MiniProfile);
    }
  }

  const onList = new Set<string>([
    event.creator_id,
    ...(invites ?? []).map((i) => i.user_id),
    ...(rsvps ?? []).map((r) => r.user_id),
  ]);
  const candidates = (friendsRaw ?? [])
    .map((f) => f.friend as unknown as MiniProfile)
    .filter((f) => f && !onList.has(f.id));

  return (
    <div className="flex flex-col gap-6">


      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={event.visibility} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <div className="text-muted-foreground flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              {formatDateTime(event.start_at)} — {formatDateTime(event.end_at)}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="size-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        {isCreator && <EventAdminMenu eventId={event.id} />}
      </div>

      <UserChip
        profile={creator}
        subtitle={`Hosted by ${creator.display_name}`}
      />

      {event.description && (
        <p className="text-sm whitespace-pre-wrap">{event.description}</p>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {isProposed ? "Vote" : "Your RSVP"}
          </CardTitle>
          <InvitePeople eventId={event.id} candidates={candidates} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isProposed ? (
            <ProposalPanel
              eventId={event.id}
              myVote={myVote}
              voteCounts={voteCounts}
              isCreator={isCreator}
              lockMode={(event.lock_mode as "threshold" | "manual" | null) ?? null}
              thresholdCount={event.threshold_count ?? null}
              votingDeadline={event.voting_deadline ?? null}
            />
          ) : (
            <>
              {event.status === "cancelled" && (
                <Badge variant="destructive" className="w-fit">Cancelled</Badge>
              )}
              <RsvpButtons eventId={event.id} current={myStatus} />
              <RsvpSummary counts={counts} />
              {going.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Going
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {going.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1"
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={g.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {initials(g.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{g.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EventPhotos eventId={event.id} userId={profile.id} />

      <EventComments eventId={event.id} userId={profile.id} />
    </div>
  );
}
