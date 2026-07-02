-- Distinguishes "manually select available times" from "automatically mark
-- free gaps as available" for group scheduling.
alter table profiles
  add column if not exists availability_mode text not null default 'manual'
    check (availability_mode in ('manual', 'auto_free'));
