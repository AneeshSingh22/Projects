-- Migration: cache what a place is known for.
--
-- Run in the Supabase SQL editor after migration-nightlife.sql. Safe to re-run.
--
-- This caches an AI recollection, not review data. A place's reputation does
-- not change hour to hour, so asking once and storing the answer avoids
-- spending quota to be told the same thing on every sheet open.
--
-- jsonb rather than separate columns: the shape is small, read whole, and never
-- queried by its internals. Splitting it into columns would buy nothing and
-- cost a migration every time the shape changes.

alter table public.places
  add column if not exists lore jsonb,
  add column if not exists lore_at timestamptz;
