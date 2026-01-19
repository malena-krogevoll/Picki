-- Fjern eksisterende check constraint og legg til ny med breakfast
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_recipe_type_check;

ALTER TABLE recipes ADD CONSTRAINT recipes_recipe_type_check 
  CHECK (recipe_type IN ('dinner', 'base', 'diy', 'breakfast'));