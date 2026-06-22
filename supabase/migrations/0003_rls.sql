-- Enable Row Level Security on every table and define access policies.

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_invites enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.availability_planners enable row level security;
alter table public.planner_participants enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;
alter table public.event_photos enable row level security;
alter table public.activities enable row level security;

-- profiles: readable by any authenticated user (directory/search); writable by self.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- friend_requests: visible to the two parties; sender creates; recipient/sender update; both can delete.
create policy fr_select on public.friend_requests for select to authenticated using (auth.uid() in (sender_id, recipient_id));
create policy fr_insert on public.friend_requests for insert to authenticated with check (sender_id = auth.uid());
create policy fr_update on public.friend_requests for update to authenticated using (auth.uid() in (sender_id, recipient_id)) with check (auth.uid() in (sender_id, recipient_id));
create policy fr_delete on public.friend_requests for delete to authenticated using (auth.uid() in (sender_id, recipient_id));

-- friendships: visible to the two parties; created only via accept_friend_request RPC; deletable by either party.
create policy fs_select on public.friendships for select to authenticated using (auth.uid() in (user_id, friend_id));
create policy fs_delete on public.friendships for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- groups: members & creator can read; creator creates; admins update; creator deletes.
create policy groups_select on public.groups for select to authenticated using (created_by = auth.uid() or is_group_member(id, auth.uid()));
create policy groups_insert on public.groups for insert to authenticated with check (created_by = auth.uid());
create policy groups_update on public.groups for update to authenticated using (is_group_admin(id, auth.uid())) with check (is_group_admin(id, auth.uid()));
create policy groups_delete on public.groups for delete to authenticated using (created_by = auth.uid());

-- group_members: members can read co-members; admins add/update; self or admin can remove.
create policy gm_select on public.group_members for select to authenticated using (is_group_member(group_id, auth.uid()));
create policy gm_insert on public.group_members for insert to authenticated with check (is_group_admin(group_id, auth.uid()));
create policy gm_update on public.group_members for update to authenticated using (is_group_admin(group_id, auth.uid())) with check (is_group_admin(group_id, auth.uid()));
create policy gm_delete on public.group_members for delete to authenticated using (user_id = auth.uid() or is_group_admin(group_id, auth.uid()));

-- events: visibility-aware read; creator manages.
create policy events_select on public.events for select to authenticated using (can_view_event(id, auth.uid()));
create policy events_insert on public.events for insert to authenticated with check (creator_id = auth.uid());
create policy events_update on public.events for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy events_delete on public.events for delete to authenticated using (creator_id = auth.uid());

-- event_invites: viewers + self can read; creator invites; creator/self remove.
create policy ei_select on public.event_invites for select to authenticated using (user_id = auth.uid() or can_view_event(event_id, auth.uid()));
create policy ei_insert on public.event_invites for insert to authenticated with check (is_event_creator(event_id, auth.uid()));
create policy ei_delete on public.event_invites for delete to authenticated using (user_id = auth.uid() or is_event_creator(event_id, auth.uid()));

-- event_rsvps: viewers read; self manages own rsvp.
create policy er_select on public.event_rsvps for select to authenticated using (can_view_event(event_id, auth.uid()));
create policy er_insert on public.event_rsvps for insert to authenticated with check (user_id = auth.uid() and can_view_event(event_id, auth.uid()));
create policy er_update on public.event_rsvps for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy er_delete on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

-- availability_blocks: self + friends + group-mates read; self writes.
create policy ab_select on public.availability_blocks for select to authenticated using (user_id = auth.uid() or is_friend(user_id, auth.uid()) or shares_group(user_id, auth.uid()));
create policy ab_insert on public.availability_blocks for insert to authenticated with check (user_id = auth.uid());
create policy ab_update on public.availability_blocks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ab_delete on public.availability_blocks for delete to authenticated using (user_id = auth.uid());

-- calendar_connections: owner only (service role bypasses RLS for sync).
create policy cc_all on public.calendar_connections for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- availability_planners: creator + participants read; creator manages.
create policy pl_select on public.availability_planners for select to authenticated using (is_planner_participant(id, auth.uid()));
create policy pl_insert on public.availability_planners for insert to authenticated with check (creator_id = auth.uid());
create policy pl_update on public.availability_planners for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy pl_delete on public.availability_planners for delete to authenticated using (creator_id = auth.uid());

-- planner_participants: participants read; creator adds; creator/self remove.
create policy pp_select on public.planner_participants for select to authenticated using (is_planner_participant(planner_id, auth.uid()));
create policy pp_insert on public.planner_participants for insert to authenticated with check (exists (select 1 from public.availability_planners p where p.id = planner_id and p.creator_id = auth.uid()));
create policy pp_delete on public.planner_participants for delete to authenticated using (user_id = auth.uid() or exists (select 1 from public.availability_planners p where p.id = planner_id and p.creator_id = auth.uid()));

-- comments: readable when the target is viewable; author writes.
create policy c_select on public.comments for select to authenticated using (
  (target_type = 'event' and can_view_event(target_id, auth.uid())) or
  (target_type = 'activity' and can_view_activity(target_id, auth.uid()))
);
create policy c_insert on public.comments for insert to authenticated with check (
  author_id = auth.uid() and (
    (target_type = 'event' and can_view_event(target_id, auth.uid())) or
    (target_type = 'activity' and can_view_activity(target_id, auth.uid()))
  )
);
create policy c_update on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy c_delete on public.comments for delete to authenticated using (author_id = auth.uid());

-- reactions: counts are non-sensitive; any authenticated user can read; self writes.
create policy r_select on public.reactions for select to authenticated using (true);
create policy r_insert on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy r_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

-- notifications: owner only (rows are created by SECURITY DEFINER triggers).
create policy n_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy n_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy n_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- event_photos: viewers read; attendees upload; uploader/creator delete.
create policy ep_select on public.event_photos for select to authenticated using (can_view_event(event_id, auth.uid()));
create policy ep_insert on public.event_photos for insert to authenticated with check (uploader_id = auth.uid() and can_view_event(event_id, auth.uid()));
create policy ep_delete on public.event_photos for delete to authenticated using (uploader_id = auth.uid() or is_event_creator(event_id, auth.uid()));

-- activities: visibility-aware feed (rows created by triggers); actor can delete.
create policy a_select on public.activities for select to authenticated using (can_view_activity(id, auth.uid()));
create policy a_delete on public.activities for delete to authenticated using (actor_id = auth.uid());
