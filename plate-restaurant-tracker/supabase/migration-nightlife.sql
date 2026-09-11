-- Migration: nightlife becomes its own category.
--
-- Run in the Supabase SQL editor after migration-deals.sql. Safe to re-run.
--
-- Why separate rather than a sub-type of food and drink: a Tuesday coffee and a
-- Saturday night out are different activities that happen to both involve
-- paying for something consumable. Keeping them in one bucket made the counts
-- panel useless for either, and made a food-versus-bar spend split awkward.
--
-- Postgres will not add a value to an enum inside a transaction that also uses
-- it, so this runs as its own statement before anything references it.

alter type place_category add value if not exists 'nightlife';
