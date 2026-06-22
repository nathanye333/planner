-- Security hardening based on database advisors.

-- 1. Pin search_path on the updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- 2. Revoke RPC EXECUTE on trigger-only functions. Triggers still run them
--    (trigger execution does not require the caller to hold EXECUTE), but they
--    are no longer reachable via the PostgREST /rpc endpoint.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_group() from public, anon, authenticated;
revoke execute on function public.handle_group_member_insert() from public, anon, authenticated;
revoke execute on function public.notify_friend_request() from public, anon, authenticated;
revoke execute on function public.notify_friend_accept() from public, anon, authenticated;
revoke execute on function public.notify_event_invite() from public, anon, authenticated;
revoke execute on function public.handle_rsvp_change() from public, anon, authenticated;
revoke execute on function public.handle_event_insert() from public, anon, authenticated;
revoke execute on function public.notify_event_update() from public, anon, authenticated;
revoke execute on function public.notify_comment() from public, anon, authenticated;
revoke execute on function public.handle_photo_insert() from public, anon, authenticated;

-- 3. Public buckets serve objects via their public URL without a SELECT policy,
--    so drop the broad listing policies (avoids exposing a full object listing).
drop policy if exists "public read avatars" on storage.objects;
drop policy if exists "public read covers" on storage.objects;
drop policy if exists "public read event photos" on storage.objects;
