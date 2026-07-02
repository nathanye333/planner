-- Per-block sharing, default-private: a block is visible to a group or friend
-- only when explicitly shared for that block. Replaces the whole-calendar
-- availability_shares grant table and the unconditional friend/group-mate
-- read access on availability_blocks, neither of which actually gated
-- anything at the database level.

-- Extend availability_block_shares to support friend recipients, not just groups.
alter table availability_block_shares rename column group_id to recipient_id;
alter table availability_block_shares
  add column recipient_type text not null default 'group'
    check (recipient_type in ('group', 'friend'));
alter table availability_block_shares alter column recipient_type drop default;

alter table availability_block_shares drop constraint if exists availability_block_shares_block_id_group_id_key;
alter table availability_block_shares
  add constraint availability_block_shares_block_id_recipient_key
    unique (block_id, recipient_type, recipient_id);

-- Replace group_id's FK (now recipient_id, which may point at a group or a
-- profile) with an application-level check instead of a DB FK, since the
-- target table depends on recipient_type.
alter table availability_block_shares drop constraint if exists availability_block_shares_group_id_fkey;

-- Rebuild RLS policies for availability_block_shares against recipient_id/recipient_type.
drop policy if exists "block_shares_owner_select" on availability_block_shares;
drop policy if exists "block_shares_owner_insert" on availability_block_shares;
drop policy if exists "block_shares_owner_delete" on availability_block_shares;
drop policy if exists "block_shares_group_member_read" on availability_block_shares;

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
    and (
      (recipient_type = 'group' and exists (
        select 1 from group_members gm
        where gm.group_id = availability_block_shares.recipient_id
          and gm.user_id = auth.uid()
      ))
      or (recipient_type = 'friend' and is_friend(recipient_id, auth.uid()))
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

create policy "block_shares_group_member_read" on availability_block_shares
  for select using (
    recipient_type = 'group' and exists (
      select 1 from group_members gm
      where gm.group_id = availability_block_shares.recipient_id
        and gm.user_id = auth.uid()
    )
  );

create policy "block_shares_friend_read" on availability_block_shares
  for select using (
    recipient_type = 'friend' and recipient_id = auth.uid()
  );

-- Helper: can the viewer see this block? Self, or an explicit share to a
-- group the viewer is in, or an explicit share to the viewer as a friend.
create or replace function public.can_view_block(bid uuid, viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from availability_blocks b
    where b.id = bid and (
      b.user_id = viewer
      or exists (
        select 1 from availability_block_shares s
        where s.block_id = b.id and (
          (s.recipient_type = 'group' and is_group_member(s.recipient_id, viewer))
          or (s.recipient_type = 'friend' and s.recipient_id = viewer)
        )
      )
    )
  );
$$;

-- Flip availability_blocks read access: friend/group-mate visibility is now
-- gated by an explicit per-block share, not blanket friendship/co-membership.
drop policy if exists ab_select on public.availability_blocks;
create policy ab_select on public.availability_blocks for select to authenticated
  using (can_view_block(id, auth.uid()));

-- Drop the superseded whole-calendar grant mechanism.
drop policy if exists "availability_shares_select_own" on availability_shares;
drop policy if exists "availability_shares_insert" on availability_shares;
drop policy if exists "availability_shares_delete" on availability_shares;
drop table if exists availability_shares;

alter table profiles drop column if exists auto_share_availability;
