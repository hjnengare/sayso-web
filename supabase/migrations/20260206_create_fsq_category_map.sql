-- FSQ category id -> Sayso taxonomy mapping
-- Deterministic mapping layer for seeding and classification

create table if not exists public.fsq_category_map (
  fsq_category_id text primary key,
  fsq_category_name text,
  sayso_subcategory_slug text not null,
  sayso_category_slug text,
  updated_at timestamptz default now()
);

create index if not exists idx_fsq_category_map_sayso_subcategory_slug
  on public.fsq_category_map (sayso_subcategory_slug);

alter table public.fsq_category_map enable row level security;

drop policy if exists "Allow public read access to fsq_category_map" on public.fsq_category_map;
create policy "Allow public read access to fsq_category_map"
  on public.fsq_category_map
  for select
  to public
  using (true);

