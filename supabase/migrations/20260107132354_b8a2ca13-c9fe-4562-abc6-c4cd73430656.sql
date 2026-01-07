-- Insert quick and easy dinner recipes
INSERT INTO recipes (title, description, category, recipe_type, servings, prep_time, cook_time, steps, allergens, diet_tags, status)
VALUES 
  ('Stekt egg med avokado-toast', 'Rask og næringsrik middag med stekt egg på sprø toast med kremet avokado', 'Vegetar', 'dinner', 2, 5, 5, ARRAY['Toast brødskivene til de er gylne.', 'Mos avokadoen med salt, pepper og litt sitronsaft.', 'Stek eggene i smør til ønsket konsistens.', 'Fordel avokadomosen på toasten og legg egget på toppen.'], ARRAY['egg', 'gluten'], ARRAY['vegetarian'], 'published'),
  
  ('Enkel kyllingwok', 'Sprø grønnsaker og saftig kylling i en smakfull woksaus', 'Kylling', 'dinner', 4, 10, 10, ARRAY['Skjær kyllingen i strimler og grønnsakene i biter.', 'Stek kyllingen i varm olje til den er gjennomstekt.', 'Tilsett grønnsakene og stek i 3-4 minutter.', 'Hell over soyasaus og sesamolje, rør godt.', 'Server over ris eller nudler.'], ARRAY[]::text[], ARRAY[]::text[], 'published'),
  
  ('Quesadilla med ost og skinke', 'Sprø tortilla fylt med smeltet ost og saftig skinke', 'Hurtigmat', 'dinner', 2, 5, 8, ARRAY['Legg ost og skinke på halve tortillaen.', 'Brett tortillaen sammen.', 'Stek i tørr panne til osten smelter og tortillaen er gyllen.', 'Skjær i biter og server med salsa.'], ARRAY['gluten', 'melk'], ARRAY[]::text[], 'published'),
  
  ('Omelett med grønnsaker', 'Luftig omelett fylt med ferske grønnsaker og ost', 'Vegetar', 'dinner', 2, 5, 8, ARRAY['Visp sammen eggene med salt og pepper.', 'Stek hakket paprika og løk i smør.', 'Hell eggeblandingen over grønnsakene.', 'Dryss over ost og brett omeletten når den stivner.'], ARRAY['egg', 'melk'], ARRAY['vegetarian'], 'published'),
  
  ('Pasta med pesto og cherrytomater', 'Enkel pasta med hjemmelaget smak på få minutter', 'Pasta', 'dinner', 4, 5, 12, ARRAY['Kok pastaen etter anvisning.', 'Halver cherrytomatene.', 'Bland varm pasta med pesto og tomater.', 'Topp med parmesan og frisk basilikum.'], ARRAY['gluten', 'melk', 'nøtter'], ARRAY['vegetarian'], 'published'),
  
  ('Fisketaco med coleslaw', 'Sprø fisketaco med kremet og frisk coleslaw', 'Fisk', 'dinner', 4, 10, 10, ARRAY['Krydre fisken med salt, pepper og paprika.', 'Stek fisken i panne til den er gjennomstekt.', 'Bland kål, gulrot og majones til coleslaw.', 'Fyll tacoskjellene med fisk og coleslaw.', 'Topp med lime og koriander.'], ARRAY['fisk', 'egg', 'gluten'], ARRAY[]::text[], 'published'),
  
  ('Bruschetta med tomat og mozzarella', 'Italiensk klassiker som er klar på minutter', 'Vegetar', 'dinner', 2, 10, 5, ARRAY['Skjær tomatene i små terninger.', 'Bland tomater med basilikum, hvitløk og olivenolje.', 'Toast brødskivene.', 'Fordel tomatblandingen på brødet og topp med mozzarella.'], ARRAY['gluten', 'melk'], ARRAY['vegetarian'], 'published'),
  
  ('Rask nuddelsuppe', 'Varmende asiatisk-inspirert suppe med nudler og grønnsaker', 'Suppe', 'dinner', 2, 5, 10, ARRAY['Kok nudlene etter anvisning.', 'Varm opp buljong med ingefær og hvitløk.', 'Tilsett grønnsaker og la det småkoke.', 'Fordel nudlene i boller og hell over suppen.'], ARRAY['gluten', 'soya'], ARRAY['vegan'], 'published'),
  
  ('Wrap med kylling og salat', 'Lett og mettende wrap perfekt for travle dager', 'Kylling', 'dinner', 2, 10, 5, ARRAY['Skjær grillet kylling i strimler.', 'Bland salat, tomat og agurk.', 'Smør dressing på wrapen.', 'Fyll med kylling og grønnsaker, og rull sammen.'], ARRAY['gluten'], ARRAY[]::text[], 'published'),
  
  ('Stekt ris med egg', 'Asiatisk favoritt som bruker rester på en smart måte', 'Vegetar', 'dinner', 2, 5, 10, ARRAY['Stek ristet hvitløk i olje.', 'Tilsett kald ris og stek til den er varm.', 'Skyv risen til side og stek egget.', 'Bland alt sammen med soyasaus og sesamolje.'], ARRAY['egg', 'soya'], ARRAY['vegetarian'], 'published');

-- Now insert ingredients for each recipe
-- We need to get the recipe IDs first, so we'll use a CTE approach
WITH new_recipes AS (
  SELECT id, title FROM recipes WHERE title IN (
    'Stekt egg med avokado-toast',
    'Enkel kyllingwok',
    'Quesadilla med ost og skinke',
    'Omelett med grønnsaker',
    'Pasta med pesto og cherrytomater',
    'Fisketaco med coleslaw',
    'Bruschetta med tomat og mozzarella',
    'Rask nuddelsuppe',
    'Wrap med kylling og salat',
    'Stekt ris med egg'
  )
)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT r.id, i.name, i.quantity, i.unit, i.allergens
FROM new_recipes r
CROSS JOIN LATERAL (
  VALUES
    -- Stekt egg med avokado-toast
    ('Stekt egg med avokado-toast', 'Egg', '4', 'stk', ARRAY['egg']),
    ('Stekt egg med avokado-toast', 'Avokado', '2', 'stk', ARRAY[]::text[]),
    ('Stekt egg med avokado-toast', 'Brød', '4', 'skiver', ARRAY['gluten']),
    ('Stekt egg med avokado-toast', 'Smør', '1', 'ss', ARRAY['melk']),
    ('Stekt egg med avokado-toast', 'Sitron', '0.5', 'stk', ARRAY[]::text[]),
    
    -- Enkel kyllingwok
    ('Enkel kyllingwok', 'Kyllingfilet', '500', 'g', ARRAY[]::text[]),
    ('Enkel kyllingwok', 'Brokkoli', '200', 'g', ARRAY[]::text[]),
    ('Enkel kyllingwok', 'Paprika', '2', 'stk', ARRAY[]::text[]),
    ('Enkel kyllingwok', 'Gulrot', '2', 'stk', ARRAY[]::text[]),
    ('Enkel kyllingwok', 'Soyasaus', '3', 'ss', ARRAY['soya']),
    ('Enkel kyllingwok', 'Sesamolje', '1', 'ss', ARRAY['sesam']),
    
    -- Quesadilla med ost og skinke
    ('Quesadilla med ost og skinke', 'Tortilla', '4', 'stk', ARRAY['gluten']),
    ('Quesadilla med ost og skinke', 'Revet ost', '200', 'g', ARRAY['melk']),
    ('Quesadilla med ost og skinke', 'Kokt skinke', '150', 'g', ARRAY[]::text[]),
    ('Quesadilla med ost og skinke', 'Salsa', '1', 'dl', ARRAY[]::text[]),
    
    -- Omelett med grønnsaker
    ('Omelett med grønnsaker', 'Egg', '6', 'stk', ARRAY['egg']),
    ('Omelett med grønnsaker', 'Paprika', '1', 'stk', ARRAY[]::text[]),
    ('Omelett med grønnsaker', 'Løk', '1', 'stk', ARRAY[]::text[]),
    ('Omelett med grønnsaker', 'Revet ost', '100', 'g', ARRAY['melk']),
    ('Omelett med grønnsaker', 'Smør', '2', 'ss', ARRAY['melk']),
    
    -- Pasta med pesto og cherrytomater
    ('Pasta med pesto og cherrytomater', 'Pasta', '400', 'g', ARRAY['gluten']),
    ('Pasta med pesto og cherrytomater', 'Pesto', '1', 'dl', ARRAY['melk', 'nøtter']),
    ('Pasta med pesto og cherrytomater', 'Cherrytomater', '300', 'g', ARRAY[]::text[]),
    ('Pasta med pesto og cherrytomater', 'Parmesan', '50', 'g', ARRAY['melk']),
    ('Pasta med pesto og cherrytomater', 'Basilikum', '1', 'bunt', ARRAY[]::text[]),
    
    -- Fisketaco med coleslaw
    ('Fisketaco med coleslaw', 'Hvit fisk', '400', 'g', ARRAY['fisk']),
    ('Fisketaco med coleslaw', 'Tacoskjell', '8', 'stk', ARRAY['gluten']),
    ('Fisketaco med coleslaw', 'Kål', '200', 'g', ARRAY[]::text[]),
    ('Fisketaco med coleslaw', 'Gulrot', '1', 'stk', ARRAY[]::text[]),
    ('Fisketaco med coleslaw', 'Majones', '3', 'ss', ARRAY['egg']),
    ('Fisketaco med coleslaw', 'Lime', '1', 'stk', ARRAY[]::text[]),
    
    -- Bruschetta med tomat og mozzarella
    ('Bruschetta med tomat og mozzarella', 'Baguette', '1', 'stk', ARRAY['gluten']),
    ('Bruschetta med tomat og mozzarella', 'Tomater', '4', 'stk', ARRAY[]::text[]),
    ('Bruschetta med tomat og mozzarella', 'Mozzarella', '200', 'g', ARRAY['melk']),
    ('Bruschetta med tomat og mozzarella', 'Basilikum', '1', 'bunt', ARRAY[]::text[]),
    ('Bruschetta med tomat og mozzarella', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
    ('Bruschetta med tomat og mozzarella', 'Olivenolje', '2', 'ss', ARRAY[]::text[]),
    
    -- Rask nuddelsuppe
    ('Rask nuddelsuppe', 'Nudler', '200', 'g', ARRAY['gluten']),
    ('Rask nuddelsuppe', 'Grønnsaksbuljong', '1', 'l', ARRAY[]::text[]),
    ('Rask nuddelsuppe', 'Ingefær', '2', 'cm', ARRAY[]::text[]),
    ('Rask nuddelsuppe', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
    ('Rask nuddelsuppe', 'Spinat', '100', 'g', ARRAY[]::text[]),
    ('Rask nuddelsuppe', 'Soyasaus', '2', 'ss', ARRAY['soya']),
    
    -- Wrap med kylling og salat
    ('Wrap med kylling og salat', 'Grillet kylling', '300', 'g', ARRAY[]::text[]),
    ('Wrap med kylling og salat', 'Tortilla wrap', '4', 'stk', ARRAY['gluten']),
    ('Wrap med kylling og salat', 'Salat', '100', 'g', ARRAY[]::text[]),
    ('Wrap med kylling og salat', 'Tomat', '2', 'stk', ARRAY[]::text[]),
    ('Wrap med kylling og salat', 'Agurk', '0.5', 'stk', ARRAY[]::text[]),
    ('Wrap med kylling og salat', 'Dressing', '3', 'ss', ARRAY['egg']),
    
    -- Stekt ris med egg
    ('Stekt ris med egg', 'Kokt ris', '4', 'dl', ARRAY[]::text[]),
    ('Stekt ris med egg', 'Egg', '3', 'stk', ARRAY['egg']),
    ('Stekt ris med egg', 'Hvitløk', '3', 'fedd', ARRAY[]::text[]),
    ('Stekt ris med egg', 'Soyasaus', '3', 'ss', ARRAY['soya']),
    ('Stekt ris med egg', 'Sesamolje', '1', 'ss', ARRAY['sesam']),
    ('Stekt ris med egg', 'Vårløk', '3', 'stk', ARRAY[]::text[])
) AS i(recipe_title, name, quantity, unit, allergens)
WHERE r.title = i.recipe_title;