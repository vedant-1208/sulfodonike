-- Run in Supabase SQL Editor. Stores which menu theme each owner picked.
alter table profiles add column if not exists menu_theme text default 'chalkboard';
NOTIFY pgrst, 'reload schema';
