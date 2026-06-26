-- Availability sharing permissions
-- By default availability blocks are private.
-- A share grant makes the owner's blocks visible to a group or a specific friend.

create table if not exists availability_shares (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  recipient_type  text not null check (recipient_type in ('friend', 'group')),
  recipient_id    uuid not null,
  created_at      timestamptz not null default now(),
  unique (owner_id, recipient_type, recipient_id)
);

alter table availability_shares enable row level security;

-- Users can see their own share grants
create policy "availability_shares_select_own" on availability_shares
  for select using (owner_id = auth.uid());

-- Users can manage their own share grants
create policy "availability_shares_insert" on availability_shares
  for insert with check (owner_id = auth.uid());

create policy "availability_shares_delete" on availability_shares
  for delete using (owner_id = auth.uid());

-- Add auto_share_with_friends flag to profiles
alter table profiles
  add column if not exists auto_share_availability boolean not null default false;
