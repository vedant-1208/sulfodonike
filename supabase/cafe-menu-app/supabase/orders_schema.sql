-- Run this in Supabase SQL Editor AFTER supabase/schema.sql has already run successfully.

create table tables (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade,
  table_number text not null,
  code text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamp default now()
);

create table orders (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at timestamp default now()
);

create table order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name_snapshot text not null,
  price_snapshot numeric,
  quantity int not null default 1
);

alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Owners manage their own tables; anyone (customers, no login) can look a table up
-- by its code to load the ordering page.
create policy "own tables" on tables for all using (auth.uid() = owner_id);
create policy "public read tables" on tables for select using (true);

-- Owners see/update/delete only their own orders.
create policy "own orders" on orders for all using (auth.uid() = owner_id);
-- Customers (anon, no login) can create an order, but only if owner_id genuinely
-- matches the table they're ordering from - this stops spoofed inserts.
create policy "public insert orders" on orders for insert to anon, authenticated
  with check (owner_id = (select owner_id from tables where id = table_id));

create policy "own order_items" on order_items for all using (
  exists (
    select 1 from orders
    where orders.id = order_items.order_id
    and orders.owner_id = auth.uid()
  )
);

-- The obvious check here would be "exists (select 1 from orders where
-- orders.id = order_id)" - but that SELECT is itself subject to RLS, and
-- anon has no SELECT policy on orders (only INSERT), so it would always
-- silently see zero rows and reject every order. This helper function runs
-- with elevated privilege for just this one existence check, without
-- opening up full read access to orders for everyone.
create or replace function public.order_exists(check_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from orders where id = check_order_id);
$$;

grant execute on function public.order_exists(uuid) to anon, authenticated;

create policy "public insert order_items" on order_items for insert to anon, authenticated
  with check (public.order_exists(order_id));

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on tables to authenticated;
grant select, insert on tables to anon;

grant select, insert, update, delete on orders to authenticated;
grant select, insert on orders to anon;

grant select, insert, update, delete on order_items to authenticated;
grant select, insert on order_items to anon;

grant usage, select on all sequences in schema public to authenticated;

-- Enable realtime so the admin dashboard gets new orders instantly.
-- If this errors saying the table is already a member, that's fine - ignore it.
alter publication supabase_realtime add table orders;

-- Make sure the API layer picks up everything above immediately rather
-- than serving a stale cached view of the schema/policies.
NOTIFY pgrst, 'reload schema';
