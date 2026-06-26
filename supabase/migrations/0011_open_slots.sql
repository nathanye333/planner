-- Add 'open' to availability_status enum.
-- 'open' means "I'm explicitly available — groups can propose events here."
alter type availability_status add value if not exists 'open';
