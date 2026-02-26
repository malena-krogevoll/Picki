-- Add nutrition columns to user_cookbook
ALTER TABLE public.user_cookbook
  ADD COLUMN calories_per_serving integer,
  ADD COLUMN protein_per_serving numeric,
  ADD COLUMN fat_per_serving numeric,
  ADD COLUMN carbs_per_serving numeric;