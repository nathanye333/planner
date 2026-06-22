import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvailabilityGrid } from "@/components/planner/availability-grid";
import { DeletePlannerButton } from "@/components/planner/delete-planner-button";
import type { MiniProfile } from "@/components/user-chip";
import { formatDate, initials } from "@/lib/format";
import { schedulingEngine } from "@/lib/scheduling/engine";
import { buildAvailabilityInput, type UserBlock } from "@/lib/scheduling/slots";

export default async function PlannerDetailPage({
  params,
}: {
  params: Promise<{ plannerId: string }>;
}) {
  const { plannerId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: planner } = await supabase
    .from("availability_planners")
    .select("*")
    .eq("id", plannerId)
    .maybeSingle();
  if (!planner) notFound();

  const { data: participantsRaw } = await supabase
    .from("planner_participants")
    .select("user_id, profile:profiles(id, display_name, username, avatar_url)")
    .eq("planner_id", plannerId);

  const participants = (participantsRaw ?? [])
    .map((p) => p.profile as unknown as MiniProfile)
    .filter(Boolean);
  const participantIds = participants.map((p) => p.id);
  const profilesById = Object.fromEntries(
    participants.map((p) => [p.id, p]),
  ) as Record<string, MiniProfile>;

  const windowStart = `${planner.date_start}T00:00:00.000Z`;
  const windowEndDate = new Date(`${planner.date_end}T00:00:00.000Z`);
  windowEndDate.setUTCDate(windowEndDate.getUTCDate() + 1);
  const windowEnd = windowEndDate.toISOString();

  const { data: blocks } =
    participantIds.length > 0
      ? await supabase
          .from("availability_blocks")
          .select("user_id, start_at, end_at, status")
          .in("user_id", participantIds)
          .gt("end_at", windowStart)
          .lt("start_at", windowEnd)
      : { data: [] as UserBlock[] };

  const input = buildAvailabilityInput(
    planner,
    participantIds,
    (blocks ?? []) as UserBlock[],
  );
  const ranked = schedulingEngine.calculateAvailability(input);

  const isCreator = planner.creator_id === profile.id;

  return (
    <div>
      <PageHeader
        title={planner.title}
        description={`${formatDate(planner.date_start)} – ${formatDate(planner.date_end)}`}
        action={isCreator ? <DeletePlannerButton plannerId={planner.id} /> : undefined}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {participants.length} participant
          {participants.length === 1 ? "" : "s"}:
        </span>
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5"
          >
            <Avatar className="size-6">
              <AvatarImage src={p.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {initials(p.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">{p.display_name}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent>
          <AvailabilityGrid
            slots={ranked}
            participantCount={input.participantCount}
            profilesById={profilesById}
            plannerTitle={planner.title}
          />
        </CardContent>
      </Card>
    </div>
  );
}
