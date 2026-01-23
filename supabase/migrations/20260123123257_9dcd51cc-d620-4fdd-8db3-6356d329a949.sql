-- Delete ingredients for the duplicate recipe first
DELETE FROM recipe_ingredients WHERE recipe_id = '49c17300-a484-4181-bfcd-dc168898ceca';

-- Delete the duplicate recipe (keeping the older one)
DELETE FROM recipes WHERE id = '49c17300-a484-4181-bfcd-dc168898ceca';