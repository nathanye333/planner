-- Fix: ab_select via can_view_block(id, auth.uid()) alone intermittently
-- failed to see a block the same statement just inserted (observed on
-- INSERT ... RETURNING) — can_view_block is STABLE and its internal query
-- didn't consistently observe the new row within the same statement.
--
-- Inlining the share-exists check directly into ab_select instead (to avoid
-- the STABLE-function indirection) causes infinite recursion instead: it
-- queries availability_block_shares, whose own SELECT policies query back
-- into availability_blocks.
--
-- Fix: check self-ownership directly and inline in the policy (fast, no
-- indirection, so the just-inserted row is always visible to its owner
-- within the same statement), and keep the share-checking half behind a
-- SECURITY DEFINER function (bypasses RLS on its internal query, breaking
-- the recursion) — but split it out from self-ownership so the STABLE
-- caching issue can only affect the friend/group share path, not the far
-- more common self-view path exercised on every insert.
drop policy if exists ab_select on public.availability_blocks;

create or replace function public.is_block_shared_with(bid uuid, viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from availability_block_shares s
    where s.block_id = bid and (
      (s.recipient_type = 'group' and is_group_member(s.recipient_id, viewer))
      or (s.recipient_type = 'friend' and s.recipient_id = viewer)
    )
  );
$$;

create policy ab_select on public.availability_blocks for select to authenticated
  using (
    user_id = auth.uid()
    or is_block_shared_with(id, auth.uid())
  );

-- Superseded by is_block_shared_with (used by ab_select) plus the inline
-- self-check; drop it since nothing else calls it.
drop function if exists public.can_view_block(uuid, uuid);
