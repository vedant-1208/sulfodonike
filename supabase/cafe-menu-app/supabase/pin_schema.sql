-- Adds the 2-digit pickup PIN to orders. Safe to run more than once.
alter table orders
  add column if not exists pin text check (pin ~ '^[0-9]{2}$');

NOTIFY pgrst, 'reload schema';
