-- Update nutrition info for all remaining recipes

-- DIY recipes
UPDATE recipes SET 
  calories_per_serving = 60,
  protein_per_serving = 2,
  fat_per_serving = 2,
  carbs_per_serving = 8
WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

UPDATE recipes SET 
  calories_per_serving = 250,
  protein_per_serving = 6,
  fat_per_serving = 10,
  carbs_per_serving = 35
WHERE title = 'Sjokolade-kikerter' AND recipe_type = 'diy';

UPDATE recipes SET 
  calories_per_serving = 70,
  protein_per_serving = 3,
  fat_per_serving = 0,
  carbs_per_serving = 15
WHERE title = 'Hjemmelagde gummibjørner' AND recipe_type = 'diy';

UPDATE recipes SET 
  calories_per_serving = 180,
  protein_per_serving = 7,
  fat_per_serving = 3,
  carbs_per_serving = 30
WHERE title = 'Yoghurtlefser' AND recipe_type = 'diy';

UPDATE recipes SET 
  calories_per_serving = 25,
  protein_per_serving = 0.5,
  fat_per_serving = 0.5,
  carbs_per_serving = 5
WHERE title = 'Hjemmelaget jordbærsyltetøy' AND recipe_type = 'diy';

-- Dinner recipes
UPDATE recipes SET 
  calories_per_serving = 650,
  protein_per_serving = 40,
  fat_per_serving = 25,
  carbs_per_serving = 60
WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 450,
  protein_per_serving = 15,
  fat_per_serving = 12,
  carbs_per_serving = 65
WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 350,
  protein_per_serving = 35,
  fat_per_serving = 18,
  carbs_per_serving = 12
WHERE title = 'Bakt laks med grønnsaker' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 450,
  protein_per_serving = 25,
  fat_per_serving = 30,
  carbs_per_serving = 15
WHERE title = 'Hjemmelaget kjøttboller' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 120,
  protein_per_serving = 4,
  fat_per_serving = 4,
  carbs_per_serving = 18
WHERE title = 'Grønnsakssuppe' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 450,
  protein_per_serving = 40,
  fat_per_serving = 10,
  carbs_per_serving = 45
WHERE title = 'Kylling med ris og grønnsaker' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 420,
  protein_per_serving = 15,
  fat_per_serving = 10,
  carbs_per_serving = 70
WHERE title = 'Pasta med tomatsaus' AND recipe_type = 'dinner';

UPDATE recipes SET 
  calories_per_serving = 400,
  protein_per_serving = 35,
  fat_per_serving = 22,
  carbs_per_serving = 15
WHERE title = 'Biff med stekte grønnsaker' AND recipe_type = 'dinner';