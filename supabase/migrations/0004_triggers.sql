-- Triggers that auto-create notifications and social feed activities.
-- All are SECURITY DEFINER so they can write to other users' notification rows.

-- Friend request created -> notify recipient.
create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, actor_id, payload)
  values (new.recipient_id, 'friend_request', new.sender_id, jsonb_build_object('request_id', new.id));
  return new;
end; $$;
create trigger trg_notify_friend_request after insert on public.friend_requests
  for each row execute function public.notify_friend_request();

-- Friend request accepted -> notify the original sender.
create or replace function public.notify_friend_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into notifications (user_id, type, actor_id, payload)
    values (new.sender_id, 'friend_accept', new.recipient_id, '{}');
  end if;
  return new;
end; $$;
create trigger trg_notify_friend_accept after update on public.friend_requests
  for each row execute function public.notify_friend_accept();

-- Group member added -> notify member + create a "joined" activity.
create or replace function public.handle_group_member_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  creator uuid;
begin
  select created_by into creator from groups where id = new.group_id;

  if auth.uid() is not null and auth.uid() <> new.user_id then
    insert into notifications (user_id, type, actor_id, payload)
    values (new.user_id, 'group_invite', auth.uid(), jsonb_build_object('group_id', new.group_id));
  end if;

  -- Skip the creator's automatic admin membership.
  if not (new.user_id = creator and new.role = 'admin') then
    insert into activities (actor_id, type, subject_id, group_id, visibility)
    values (new.user_id, 'group_joined', new.group_id, new.group_id, 'group');
  end if;
  return new;
end; $$;
create trigger trg_group_member_insert after insert on public.group_members
  for each row execute function public.handle_group_member_insert();

-- Event invite -> notify invitee.
create or replace function public.notify_event_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id <> coalesce(new.invited_by, new.user_id) then
    insert into notifications (user_id, type, actor_id, payload)
    values (new.user_id, 'event_invite', new.invited_by, jsonb_build_object('event_id', new.event_id));
  end if;
  return new;
end; $$;
create trigger trg_notify_event_invite after insert on public.event_invites
  for each row execute function public.notify_event_invite();

-- RSVP changed -> notify event creator + feed activity.
create or replace function public.handle_rsvp_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  creator uuid;
begin
  select creator_id into creator from events where id = new.event_id;
  if creator is not null and creator <> new.user_id then
    insert into notifications (user_id, type, actor_id, payload)
    values (creator, 'rsvp_change', new.user_id,
            jsonb_build_object('event_id', new.event_id, 'status', new.status));
  end if;
  insert into activities (actor_id, type, subject_id, visibility, payload)
  values (new.user_id, 'rsvp_changed', new.event_id, 'friends',
          jsonb_build_object('status', new.status));
  return new;
end; $$;
create trigger trg_rsvp_change after insert or update on public.event_rsvps
  for each row execute function public.handle_rsvp_change();

-- Event created -> feed activity (skip private events).
create or replace function public.handle_event_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility <> 'private' then
    insert into activities (actor_id, type, subject_id, group_id, visibility, payload)
    values (new.creator_id, 'event_created', new.id, new.group_id, new.visibility,
            jsonb_build_object('title', new.title));
  end if;
  return new;
end; $$;
create trigger trg_event_insert after insert on public.events
  for each row execute function public.handle_event_insert();

-- Event updated -> notify invitees (excluding the creator).
create or replace function public.notify_event_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is distinct from old.title
     or new.start_at is distinct from old.start_at
     or new.end_at is distinct from old.end_at
     or new.location is distinct from old.location then
    insert into notifications (user_id, type, actor_id, payload)
    select i.user_id, 'event_update', new.creator_id, jsonb_build_object('event_id', new.id)
    from event_invites i
    where i.event_id = new.id and i.user_id <> new.creator_id;
  end if;
  return new;
end; $$;
create trigger trg_notify_event_update after update on public.events
  for each row execute function public.notify_event_update();

-- Comment -> notify the relevant owner(s).
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  creator uuid;
  parent_author uuid;
begin
  if new.parent_id is not null then
    select author_id into parent_author from comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into notifications (user_id, type, actor_id, payload)
      values (parent_author, 'comment', new.author_id,
              jsonb_build_object('target_type', new.target_type, 'target_id', new.target_id));
    end if;
  end if;

  if new.target_type = 'event' then
    select creator_id into creator from events where id = new.target_id;
    if creator is not null and creator <> new.author_id and creator is distinct from parent_author then
      insert into notifications (user_id, type, actor_id, payload)
      values (creator, 'comment', new.author_id,
              jsonb_build_object('target_type', 'event', 'target_id', new.target_id));
    end if;
  end if;
  return new;
end; $$;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_comment();

-- Photos uploaded -> feed activity (deduped within 6h per uploader/event).
create or replace function public.handle_photo_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from activities
    where actor_id = new.uploader_id and type = 'photos_uploaded'
      and subject_id = new.event_id and created_at > now() - interval '6 hours'
  ) then
    insert into activities (actor_id, type, subject_id, visibility)
    values (new.uploader_id, 'photos_uploaded', new.event_id, 'friends');
  end if;
  return new;
end; $$;
create trigger trg_photo_insert after insert on public.event_photos
  for each row execute function public.handle_photo_insert();
