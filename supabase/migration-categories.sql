-- Migration: places become general, not just restaurants.
--
-- Run this in the Supabase SQL editor AFTER schema.sql. Safe to re-run.
--
-- Context: the app was built as a restaurant map. The data model was always
-- general - a place is a location, a visit is one occasion there - so this adds
-- a category rather than restructuring anything.

-- ------------------------------------------------------------- category ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'place_category') then
    create type place_category as enum (
      'food_drink',
      'entertainment',
      'sports',
      'outdoors',
      'other'
    );
  end if;
end $$;

alter table public.places
  add column if not exists category place_category not null default 'food_drink';

-- Everything that existed before this migration was a restaurant, so the
-- default is already correct for it. Stated explicitly so re-running on a
-- partially migrated database cannot leave nulls.
update public.places set category = 'food_drink' where category is null;

-- Filtering by category is the main new query, and it is always scoped to the
-- user.
create index if not exists places_user_category_idx
  on public.places (user_id, category);

-- --------------------------------------------------------------- visits ----
-- One free-text field replacing the food-specific "dishes" for other
-- categories. Kept as a separate column rather than renaming dishes, so no
-- existing data moves and nothing already logged is at risk.
alter table public.visits
  add column if not exists activity text[];
