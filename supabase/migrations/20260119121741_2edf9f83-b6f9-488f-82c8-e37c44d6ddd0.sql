-- Add nutrition columns to recipes table
ALTER TABLE recipes
ADD COLUMN calories_per_serving INTEGER,
ADD COLUMN protein_per_serving NUMERIC(5,1),
ADD COLUMN fat_per_serving NUMERIC(5,1),
ADD COLUMN carbs_per_serving NUMERIC(5,1);

-- Update existing recipes with nutrition info where available

-- Sprø proteinchips (110 kcal total / 2 servings = 55 per serving)
UPDATE recipes SET 
  calories_per_serving = 55,
  protein_per_serving = 11.5,
  fat_per_serving = 1,
  carbs_per_serving = 1
WHERE title = 'Sprø proteinchips' AND recipe_type = 'diy';

-- Kyllingpasta med linser (500 kcal per serving from original)
UPDATE recipes SET 
  calories_per_serving = 500,
  protein_per_serving = 40,
  fat_per_serving = 12,
  carbs_per_serving = 57
WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

-- Proteinpizza med kyllingbunn (1400-1550 kcal total / 2 servings)
UPDATE recipes SET 
  calories_per_serving = 740,
  protein_per_serving = 82.5,
  fat_per_serving = 35,
  carbs_per_serving = 15
WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';