UPDATE recipe_ingredients 
SET name = 'Ost'
WHERE name = 'Mager ost' 
AND recipe_id = (SELECT id FROM recipes WHERE title = 'Sprø proteinchips' AND recipe_type = 'diy');