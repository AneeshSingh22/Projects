-- Plate — schema. Run in the Supabase SQL editor.
--
-- This supersedes plan.md section 7. Differences, all deliberate:
--   1. gen_random_uuid() instead of the uuid-ossp extension. Built into
--      Postgres 13+, so it drops an extension for no loss of behaviour.
--   2. An updated_at trigger. Section 7 defaulted the column on insert and then
--      never touched it, making it a duplicate of created_at.
--   3. The storage bucket and its policy, which section 7 described in prose.
--   4. Written to be safely re-runnable.

-- ---------------------------------------------------------------- enum ------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'place_status') then
    create type place_status as enum ('want_to_try', 'visited', 'favorite', 'avoid');
  end if;
end $$;

-- ------------------------------------------------------------- updated_at ---
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- places ----
create table if not exists public.places (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  google_place_id text,
  name            text not null,
  address         text,
  city            text,
  country         text,
  lat             double precision not null,
  lng             double precision not null,
  status          place_status not null default 'want_to_try',
  cuisine         text,
  price_level     smallint check (price_level between 1 and 4),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Postgres treats NULLs as distinct in unique indexes, so this constrains
  -- Google-sourced places to one row each while still allowing any number of
  -- manually dropped pins, which carry a null google_place_id.
  unique (user_id, google_place_id)
);

create index if not exists places_user_bbox_idx   on public.places (user_id, lat, lng);
create index if not exists places_user_status_idx on public.places (user_id, status);

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- visits ----
create table if not exists public.visits (
  id           uuid primary key default gen_random_uuid(),
  place_id     uuid not null references public.places(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  visited_on   date not null default current_date,
  rating       numeric(3,1) check (rating between 0 and 10),
  notes        text,
  dishes       text[],
  companions   text[],
  price_paid   numeric(10,2),
  would_return boolean,
  occasion     text,
  created_at   timestamptz not null default now()
);

create index if not exists visits_place_idx     on public.visits (place_id, visited_on desc);
create index if not exists visits_user_date_idx on public.visits (user_id, visited_on desc);

-- ---------------------------------------------------------------- photos ----
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  visit_id     uuid not null references public.visits(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  thumb_path   text not null,
  caption      text,
  width        integer,
  height       integer,
  bytes        integer,
  created_at   timestamptz not null default now()
);

create index if not exists photos_visit_idx on public.photos (visit_id);

-- ------------------------------------------------------------------ RLS -----
alter table public.places enable row level security;
alter table public.visits enable row level security;
alter table public.photos enable row level security;

drop policy if exists "own places" on public.places;
create policy "own places" on public.places for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own visits" on public.visits;
create policy "own visits" on public.visits for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------- storage -----
-- Private bucket. Reads go through short-lived signed URLs, batch-signed per
-- sheet open rather than one round trip per thumbnail.
insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

-- Paths must be {user_id}/{visit_id}/{uuid}.jpg — the first path segment is
-- what this policy checks, so an upload written anywhere else is rejected.
drop policy if exists "own visit photos" on storage.objects;
create policy "own visit photos" on storage.objects for all to authenticated
  using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
