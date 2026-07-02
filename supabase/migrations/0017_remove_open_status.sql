-- Remove 'open' from availability_status: sharing is now per-block and
-- applies to every status, so 'open' no longer carries distinct meaning
-- (it used to be the only status that triggered the group-share picker).
-- Existing 'open' blocks become 'free' — the share rows they already carry
-- are untouched.
update availability_blocks set status = 'free' where status = 'open';

alter type availability_status rename to availability_status_old;
create type availability_status as enum ('committed', 'tentative', 'free');

alter table availability_blocks
  alter column status drop default,
  alter column status type availability_status using status::text::availability_status,
  alter column status set default 'committed';

drop type availability_status_old;
