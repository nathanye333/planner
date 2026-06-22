-- Security-definer helper functions used by RLS policies and RPCs.
-- Defined as SECURITY DEFINER so they can read the underlying tables without
-- being blocked by (or recursing into) RLS policies.

create or replace function public.is_friend(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from friendships where user_id = a and friend_id = b);
$$;

create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = uid);
$$;

create or replace function public.is_group_admin(gid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = uid and role = 'admin');
$$;

create or replace function public.shares_group(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members g1
    join group_members g2 on g1.group_id = g2.group_id
    where g1.user_id = a and g2.user_id = b
  );
$$;

create or replace function public.is_event_creator(eid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from events where id = eid and creator_id = uid);
$$;

create or replace function public.is_planner_participant(pid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from availability_planners where id = pid and creator_id = uid
    union
    select 1 from planner_participants where planner_id = pid and user_id = uid
  );
$$;

create or replace function public.can_view_event(eid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from events e
    where e.id = eid and (
      e.creator_id = uid
      or exists (select 1 from event_invites i where i.event_id = e.id and i.user_id = uid)
      or e.visibility = 'public'
      or (e.visibility = 'friends' and is_friend(e.creator_id, uid))
      or (e.visibility = 'group' and e.group_id is not null and is_group_member(e.group_id, uid))
    )
  );
$$;

create or replace function public.can_view_activity(aid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from activities a
    where a.id = aid and (
      a.actor_id = uid
      or a.visibility = 'public'
      or (a.visibility = 'friends' and is_friend(a.actor_id, uid))
      or (a.visibility = 'group' and a.group_id is not null and is_group_member(a.group_id, uid))
    )
  );
$$;

-- Accept a friend request: validates the caller is the recipient, marks the
-- request accepted, and inserts both directional friendship rows.
create or replace function public.accept_friend_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  req public.friend_requests;
begin
  select * into req from friend_requests where id = request_id;
  if req is null then
    raise exception 'Friend request not found';
  end if;
  if req.recipient_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  update friend_requests set status = 'accepted' where id = request_id;
  insert into friendships (user_id, friend_id)
  values (req.sender_id, req.recipient_id), (req.recipient_id, req.sender_id)
  on conflict do nothing;
end; $$;

-- Remove a friend: deletes both directional rows for the caller and target.
create or replace function public.remove_friend(other_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from friendships
  where (user_id = auth.uid() and friend_id = other_id)
     or (user_id = other_id and friend_id = auth.uid());
  delete from friend_requests
  where (sender_id = auth.uid() and recipient_id = other_id)
     or (sender_id = other_id and recipient_id = auth.uid());
end; $$;
