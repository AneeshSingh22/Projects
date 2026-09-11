-- Migration: deals you have seen yourself.
--
-- Run in the Supabase SQL editor after migration-categories.sql. Safe to re-run.
--
-- Why a table you fill in rather than a feed you subscribe to: there is no free,
-- reliable source of restaurant deals. No API sells "half-price apps on Tuesday"
-- as structured data. An LLM will guess, and be confidently wrong about a thing
-- you would drive across town for - which is worse than having no feature.
--
-- A deal you noted yourself is always right, and the data compounds: the app
-- gets more useful the longer you use it, rather than depending on somebody
-- else's dataset staying alive.

create table if not exists public.deals (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- What the deal is, in your own words: "half price apps", "$6 drafts".
  description text not null,

  -- Days it runs, as ISO weekday numbers: 1 = Monday ... 7 = Sunday.
  -- An array rather than seven booleans, because "Tue and Thu" is one fact.
  -- Empty or null means every day.
  days        smallint[],

  -- Local wall-clock times, deliberately NOT timestamptz. A happy hour is
  -- "16:00 to 18:00 wherever the restaurant is", not an instant in time. Storing
  -- it with a zone would make it shift when you travel, which is wrong.
  starts_at   time,
  ends_at     time,

  -- Set when a deal is seasonal or you know it is ending.
  expires_on  date,

  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists deals_user_idx  on public.deals (user_id);
create index if not exists deals_place_idx on public.deals (place_id);

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

alter table public.deals enable row level security;

drop policy if exists "own deals" on public.deals;
create policy "own deals" on public.deals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
