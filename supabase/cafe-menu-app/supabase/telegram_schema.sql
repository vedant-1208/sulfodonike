-- Run this in Supabase SQL Editor. Lets each owner store their own
-- Telegram chat ID so notifications go to the right person.

alter table profiles add column if not exists telegram_chat_id text;

NOTIFY pgrst, 'reload schema';
