-- Enable Realtime (postgres_changes) for tables that drive live UI updates.
-- RLS still applies to realtime subscriptions for the authenticated role.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.event_rsvps;
