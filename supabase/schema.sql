-- ============================================================
-- LayerLedger — Supabase schema
-- Run once in Supabase dashboard → SQL Editor → New query → Run.
-- ============================================================

-- 1. Sales table -------------------------------------------------
create table if not exists public.sales (
  id          uuid primary key default gen_random_uuid(),
  item        text not null,
  customer    text not null,
  qty         integer not null default 1,
  price       numeric not null,
  weight_g    numeric,
  print_type  text not null default 'regular',
  model_files jsonb not null default '[]',   -- array of { path, name }
  images      text[] not null default '{}',  -- array of storage paths
  created_at  timestamptz not null default now()
);

-- Migrating from the old single-file column? If the table already exists and is
-- empty, just: drop table public.sales;  then re-run this whole file.

create index if not exists sales_created_at_idx on public.sales (created_at desc);

-- 2. Row Level Security: only signed-in users touch the data -----
alter table public.sales enable row level security;

drop policy if exists "authenticated full access" on public.sales;
create policy "authenticated full access"
  on public.sales for all
  to authenticated
  using (true)
  with check (true);

-- 3. Realtime (optional — enables cross-device live sync) --------
-- Safe to run; ignore the error if the table is already in the publication.
alter publication supabase_realtime add table public.sales;

-- 4. Storage bucket for photos + model files ---------------------
-- Private bucket; files are served via short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('sales', 'sales', false)
on conflict (id) do nothing;

-- Storage policies: signed-in users can read/write/delete in 'sales'
drop policy if exists "sales read"   on storage.objects;
drop policy if exists "sales insert" on storage.objects;
drop policy if exists "sales delete" on storage.objects;

create policy "sales read"
  on storage.objects for select to authenticated
  using (bucket_id = 'sales');

create policy "sales insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'sales');

create policy "sales delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sales');
