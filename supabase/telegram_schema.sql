-- Run this in Supabase SQL Editor. Lets each owner store their own
-- Telegram chat ID so notifications go to the right person.

alter table profiles add column if not exists telegram_chat_id text;

NOTIFY pgrst, 'reload schema';

-- The server-side routes (push + telegram) use the service_role key. Make sure
-- that role can read/write every table, now and for tables added later.
-- (A missing grant here makes the route silently fail to find the owner's
-- Telegram chat ID.)
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

NOTIFY pgrst, 'reload schema';
