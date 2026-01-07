-- Add ingredients for DIY recipes (Hjemmelaget ketchup)
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Tomatpuré', '400', 'g', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget ketchup';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Eplecidereddik', '0.5', 'dl', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget ketchup';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Honning', '3', 'ss', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget ketchup';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Salt', '0.5', 'ts', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget ketchup';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløkspulver', '0.5', 'ts', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget ketchup';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Løkpulver', '0.25', 'ts', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget ketchup';

-- Add ingredients for Hjemmelaget majones
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Eggeplomme', '1', 'stk', ARRAY['egg']::text[] FROM public.recipes WHERE title = 'Hjemmelaget majones';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Dijon-sennep', '1', 'ts', ARRAY['sennep']::text[] FROM public.recipes WHERE title = 'Hjemmelaget majones';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitronsaft', '1', 'ss', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget majones';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Nøytral olje', '2', 'dl', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget majones';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Salt', '', '', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget majones';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pepper', '', '', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget majones';

-- Add ingredients for Hjemmelaget pizzabunn
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvetemel', '500', 'g', ARRAY['gluten']::text[] FROM public.recipes WHERE title = 'Hjemmelaget pizzabunn';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Tørrgjær', '1', 'pakke', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget pizzabunn';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Salt', '1', 'ts', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget pizzabunn';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Lunkent vann', '3', 'dl', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget pizzabunn';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget pizzabunn';

-- Add ingredients for Hjemmelaget grønnsaksbuljong
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Gulrøtter', '3', 'stk', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Løk', '2', 'stk', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Stangselleri', '3', 'stilker', ARRAY['selleri']::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Purre', '1', 'stk', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Laurbærblad', '2', 'stk', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk timian', '5', 'kvister', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pepperkorn', '10', 'stk', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Vann', '2', 'liter', ARRAY[]::text[] FROM public.recipes WHERE title = 'Hjemmelaget grønnsaksbuljong';

-- Add ingredients for Klassisk pesto
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk basilikum', '2', 'dl', ARRAY[]::text[] FROM public.recipes WHERE title = 'Klassisk pesto';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '2', 'fedd', ARRAY[]::text[] FROM public.recipes WHERE title = 'Klassisk pesto';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pinjekjerner', '0.5', 'dl', ARRAY['nøtter']::text[] FROM public.recipes WHERE title = 'Klassisk pesto';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Parmesan', '0.5', 'dl', ARRAY['melk']::text[] FROM public.recipes WHERE title = 'Klassisk pesto';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '1', 'dl', ARRAY[]::text[] FROM public.recipes WHERE title = 'Klassisk pesto';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Salt', '', '', ARRAY[]::text[] FROM public.recipes WHERE title = 'Klassisk pesto';
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pepper', '', '', ARRAY[]::text[] FROM public.recipes WHERE title = 'Klassisk pesto';