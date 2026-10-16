-- ============================================================
-- LayerLedger: Full Database Schema
-- Run in Supabase SQL Editor: New Query -> Run
-- ============================================================

-- 1. Sales & Orders table
create table if not exists public.sales (
  id                   uuid primary key default gen_random_uuid(),
  item                 text not null,
  customer             text not null,
  customer_contact     text,
  description          text,
  qty                  integer not null default 1,
  price                numeric not null,
  weight_g             numeric,
  print_type           text not null default 'regular',
  priority             text not null default 'standard',
  delivery_date        date,
  production_status    text not null default 'order_received',
  primary_color        text,
  primary_color_code   text,
  secondary_color      text,
  secondary_color_code text,
  paint_type           text,
  finish               text,
  special_instructions text,
  color_notes          text,
  colors               jsonb not null default '[]',
  model_files          jsonb not null default '[]',
  images               text[] not null default '{}',
  created_at           timestamptz not null default now()
);

-- Ensure all order management columns exist if table already exists
alter table public.sales
  add column if not exists priority text not null default 'standard',
  add column if not exists delivery_date date,
  add column if not exists production_status text not null default 'order_received',
  add column if not exists customer_contact text,
  add column if not exists description text,
  add column if not exists primary_color text,
  add column if not exists primary_color_code text,
  add column if not exists secondary_color text,
  add column if not exists secondary_color_code text,
  add column if not exists paint_type text,
  add column if not exists finish text,
  add column if not exists special_instructions text,
  add column if not exists color_notes text,
  add column if not exists colors jsonb not null default '[]';

create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists sales_priority_idx on public.sales (priority);
create index if not exists sales_delivery_date_idx on public.sales (delivery_date);
create index if not exists sales_production_status_idx on public.sales (production_status);
create index if not exists sales_customer_idx on public.sales (customer);

-- 2. Order History table
create table if not exists public.order_history (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references public.sales(id) on delete cascade,
  field_changed text not null,
  old_value     text,
  new_value     text,
  notes         text,
  changed_by    text,
  created_at    timestamptz not null default now()
);

create index if not exists order_history_sale_id_idx on public.order_history (sale_id, created_at desc);

-- 3. Row Level Security
alter table public.sales enable row level security;
alter table public.order_history enable row level security;

drop policy if exists "authenticated full access" on public.sales;
create policy "authenticated full access"
  on public.sales for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "anon access to sales" on public.sales;
create policy "anon access to sales"
  on public.sales for all
  to anon
  using (true)
  with check (true);

drop policy if exists "authenticated history access" on public.order_history;
create policy "authenticated history access"
  on public.order_history for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "anon access to order_history" on public.order_history;
create policy "anon access to order_history"
  on public.order_history for all
  to anon
  using (true)
  with check (true);

-- 4. Realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.sales;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.order_history;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- 5. Storage bucket for model files + photo uploads
insert into storage.buckets (id, name, public)
values ('sales', 'sales', true)
on conflict (id) do nothing;

drop policy if exists "sales bucket select" on storage.objects;
create policy "sales bucket select"
  on storage.objects for select
  using (bucket_id = 'sales');

drop policy if exists "sales bucket insert" on storage.objects;
create policy "sales bucket insert"
  on storage.objects for insert
  with check (bucket_id = 'sales');

drop policy if exists "sales bucket update" on storage.objects;
create policy "sales bucket update"
  on storage.objects for update
  using (bucket_id = 'sales');

drop policy if exists "sales bucket delete" on storage.objects;
create policy "sales bucket delete"
  on storage.objects for delete
  using (bucket_id = 'sales');
