-- The app is fully authenticated; the anon role never satisfies any RLS policy
-- (all policies are `to authenticated`). These SECURITY DEFINER helpers/RPCs
-- ship with a default `GRANT EXECUTE TO PUBLIC`, so anon inherits access.
-- Revoke from PUBLIC + anon and grant only authenticated, which the RLS policies
-- and app RPC calls require.
do $$
declare
  fn text;
  fns text[] := array[
    'public.is_friend(uuid, uuid)',
    'public.is_group_member(uuid, uuid)',
    'public.is_group_admin(uuid, uuid)',
    'public.shares_group(uuid, uuid)',
    'public.is_event_creator(uuid, uuid)',
    'public.is_planner_participant(uuid, uuid)',
    'public.can_view_event(uuid, uuid)',
    'public.can_view_activity(uuid, uuid)',
    'public.accept_friend_request(uuid)',
    'public.remove_friend(uuid)'
  ];
begin
  foreach fn in array fns loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
