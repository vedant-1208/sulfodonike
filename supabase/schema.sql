-- Run this entire file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create table profiles (
  id uuid references auth.users(id) primary key,
  restaurant_name text,
  slug text unique,
  logo_url text,
  created_at timestamp default now()
);

create table categories (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  sort_order int default 0
);

create table menu_items (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric,
  image_url text,
  is_available boolean default true,
  sort_order int default 0
);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own categories" on categories for all using (auth.uid() = owner_id);
create policy "own items" on menu_items for all using (auth.uid() = owner_id);

create policy "public read items" on menu_items for select using (is_available = true);
create policy "public read categories" on categories for select using (true);
create policy "public read profiles" on profiles for select using (true);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, restaurant_name, slug)
  values (new.id, 'My Restaurant', 'restaurant-' || substr(new.id::text, 1, 8));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

NOTIFY pgrst, 'reload schema';
