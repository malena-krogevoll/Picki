
-- Remove Smash burger (has ultra-processed burgerbrød and cheddarost)
DELETE FROM recipe_ingredients WHERE recipe_id = 'e1c50f4e-20c5-42f9-a2d8-dbfaa9432af2';
DELETE FROM recipes WHERE id = 'e1c50f4e-20c5-42f9-a2d8-dbfaa9432af2';

-- Remove Cloud bread (has kremost, NOVA 3-4)
DELETE FROM recipe_ingredients WHERE recipe_id = '7752e07a-d945-4f78-acd4-39158887b5e5';
DELETE FROM recipes WHERE id = '7752e07a-d945-4f78-acd4-39158887b5e5';
