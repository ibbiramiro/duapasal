create table if not exists public.wilayah_provinces (
  id text primary key,
  name text not null
);

create table if not exists public.wilayah_regencies (
  id text primary key,
  province_id text not null references public.wilayah_provinces(id) on delete cascade,
  name text not null
);

create index if not exists wilayah_regencies_province_id_idx on public.wilayah_regencies(province_id);

create table if not exists public.wilayah_districts (
  id text primary key,
  regency_id text not null references public.wilayah_regencies(id) on delete cascade,
  name text not null
);

create index if not exists wilayah_districts_regency_id_idx on public.wilayah_districts(regency_id);

create table if not exists public.wilayah_villages (
  id text primary key,
  district_id text not null references public.wilayah_districts(id) on delete cascade,
  name text not null
);

create index if not exists wilayah_villages_district_id_idx on public.wilayah_villages(district_id);

alter table public.profiles
  add column if not exists village text;
