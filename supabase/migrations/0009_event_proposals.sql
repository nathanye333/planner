-- Event proposal voting mechanic
-- Adds status, lock_mode, threshold, and voting_deadline to events.
-- Adds proposal_votes table for tracking per-user votes on proposed events.

alter table events
  add column if not exists status text not null default 'confirmed'
    check (status in ('proposed', 'confirmed', 'cancelled')),
  add column if not exists lock_mode text
    check (lock_mode in ('threshold', 'manual')),
  add column if not exists threshold_count integer,
  add column if not exists voting_deadline timestamptz;

create table if not exists proposal_votes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  vote        text not null check (vote in ('yes', 'maybe', 'no')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

-- RLS
alter table proposal_votes enable row level security;

-- Only the creator or an invited user can see votes
create policy "proposal_votes_select" on proposal_votes
  for select using (
    exists (
      select 1 from events e
      where e.id = proposal_votes.event_id
        and (
          e.creator_id = auth.uid()
          or exists (
            select 1 from event_invites ei
            where ei.event_id = e.id and ei.user_id = auth.uid()
          )
        )
    )
  );

-- Only the creator or an invited user can vote on a proposed event
create policy "proposal_votes_insert" on proposal_votes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = proposal_votes.event_id
        and e.status = 'proposed'
        and (
          e.creator_id = auth.uid()
          or exists (
            select 1 from event_invites ei
            where ei.event_id = e.id and ei.user_id = auth.uid()
          )
        )
    )
  );

-- Same invitation/creator guard on updates
create policy "proposal_votes_update" on proposal_votes
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = proposal_votes.event_id
        and e.status = 'proposed'
        and (
          e.creator_id = auth.uid()
          or exists (
            select 1 from event_invites ei
            where ei.event_id = e.id and ei.user_id = auth.uid()
          )
        )
    )
  );

create policy "proposal_votes_delete" on proposal_votes
  for delete using (user_id = auth.uid());

-- Enable realtime for vote tally updates
alter publication supabase_realtime add table proposal_votes;
