-- Per-block sharing: tracks which groups a specific open availability block is shared with.
create table if not exists availability_block_shares (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references availability_blocks(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (block_id, group_id)
);

alter table availability_block_shares enable row level security;

-- Owner can manage shares for their own blocks
create policy "block_shares_owner" on availability_block_shares
  for all using (
    exists (
      select 1 from availability_blocks b
      where b.id = availability_block_shares.block_id
        and b.user_id = auth.uid()
    )
  );

-- Group members can read shares for their groups (so group calendar can filter)
create policy "block_shares_group_member_read" on availability_block_shares
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = availability_block_shares.group_id
        and gm.user_id = auth.uid()
    )
  );
