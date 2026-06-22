-- Gather core schema: enums, tables, indexes, base triggers.

-- Enums --------------------------------------------------------------------
create type availability_status as enum ('committed', 'tentative', 'free');
create type rsvp_status as enum ('committed', 'tentative', 'declined');
create type visibility as enum ('private', 'friends', 'group', 'public');
create type request_status as enum ('pending', 'accepted', 'declined');
create type group_role as enum ('member', 'admin');
create type block_source as enum ('google', 'manual');
create type comment_target as enum ('event', 'activity');
create type reaction_target as enum ('event', 'activity', 'comment', 'photo');
create type reaction_type as enum ('like', 'love', 'celebrate', 'laugh');
create type notification_type as enum (
  'friend_request', 'friend_accept', 'group_invite', 'event_invite',
  'event_update', 'rsvp_change', 'comment'
);
create type activity_type as enum (
  'event_created', 'rsvp_changed', 'group_joined', 'photos_uploaded'
);

-- Generic updated_at trigger -----------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- profiles -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  username text unique,
  avatar_url text,
  timezone text not null default 'UTC',
  bio text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- friend_requests ----------------------------------------------------------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);
create index friend_requests_recipient_idx on public.friend_requests (recipient_id);
create trigger friend_requests_updated_at before update on public.friend_requests
  for each row execute function public.set_updated_at();

-- friendships (bidirectional rows) -----------------------------------------
create table public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index friendships_friend_idx on public.friendships (friend_id);

-- groups -------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index groups_created_by_idx on public.groups (created_by);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role group_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- Add the group creator as an admin member automatically.
create or replace function public.handle_new_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;
  return new;
end; $$;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- events -------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  title text not null,
  description text,
  cover_url text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);
create index events_creator_idx on public.events (creator_id);
create index events_group_idx on public.events (group_id);
create index events_start_idx on public.events (start_at);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_invites (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_invites_user_idx on public.event_invites (user_id);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status rsvp_status not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_idx on public.event_rsvps (user_id);
create trigger event_rsvps_updated_at before update on public.event_rsvps
  for each row execute function public.set_updated_at();

-- availability -------------------------------------------------------------
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status availability_status not null default 'committed',
  source block_source not null default 'manual',
  external_id text,
  is_override boolean not null default false,
  -- title is NULL by default; only set when the user explicitly shares it.
  title text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index availability_blocks_user_time_idx
  on public.availability_blocks (user_id, start_at, end_at);
create unique index availability_blocks_external_idx
  on public.availability_blocks (user_id, source, external_id)
  where external_id is not null;

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'google',
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  last_synced_at timestamptz,
  sync_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- availability planners ----------------------------------------------------
create table public.availability_planners (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  date_start date not null,
  date_end date not null,
  day_start_hour int not null default 8,
  day_end_hour int not null default 22,
  slot_minutes int not null default 30,
  group_id uuid references public.groups (id) on delete set null,
  created_at timestamptz not null default now()
);
create index planners_creator_idx on public.availability_planners (creator_id);

create table public.planner_participants (
  planner_id uuid not null references public.availability_planners (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (planner_id, user_id)
);
create index planner_participants_user_idx on public.planner_participants (user_id);

-- social content -----------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  target_type comment_target not null,
  target_id uuid not null,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index comments_target_idx on public.comments (target_type, target_id);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type reaction_target not null,
  target_id uuid not null,
  type reaction_type not null default 'like',
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, type)
);
create index reactions_target_idx on public.reactions (target_type, target_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notification_type not null,
  actor_id uuid references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index event_photos_event_idx on public.event_photos (event_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type activity_type not null,
  subject_id uuid,
  group_id uuid references public.groups (id) on delete cascade,
  visibility visibility not null default 'friends',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activities_created_idx on public.activities (created_at desc);
create index activities_actor_idx on public.activities (actor_id);
