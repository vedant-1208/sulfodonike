-- Run this in Supabase SQL Editor after schema.sql and orders_schema.sql.

create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp default now()
);

alter table push_subscriptions enable row level security;

create policy "own push subscriptions" on push_subscriptions for all using (auth.uid() = owner_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on push_subscriptions to authenticated;
grant usage, select on all sequences in schema public to authenticated;

NOTIFY pgrst, 'reload schema';
