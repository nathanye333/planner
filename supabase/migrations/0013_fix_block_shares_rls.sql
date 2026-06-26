-- Fix: split the catch-all block_shares_owner policy into per-operation policies.
-- The insert policy now also requires the caller to be a member of the target group,
-- preventing sharing a block with an arbitrary group_id (IDOR).
drop policy if exists "block_shares_owner" on availability_block_shares;

create policy "block_shares_owner_select" on availability_block_shares
  for select using (
    exists (
      select 1 from availability_blocks b
      where b.id = availability_block_shares.block_id
        and b.user_id = auth.uid()
    )
  );

create policy "block_shares_owner_insert" on availability_block_shares
  for insert with check (
    exists (
      select 1 from availability_blocks b
      where b.id = availability_block_shares.block_id
        and b.user_id = auth.uid()
    )
    and exists (
      select 1 from group_members gm
      where gm.group_id = availability_block_shares.group_id
        and gm.user_id = auth.uid()
    )
  );

create policy "block_shares_owner_delete" on availability_block_shares
  for delete using (
    exists (
      select 1 from availability_blocks b
      where b.id = availability_block_shares.block_id
        and b.user_id = auth.uid()
    )
  );
