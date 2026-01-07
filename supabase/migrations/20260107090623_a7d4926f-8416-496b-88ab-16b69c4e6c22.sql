
-- Insert more clean, simple and quick dinner recipes
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps) VALUES

-- Kylling & Fisk
('Sitronbakt laks med grønnsaker', 'Enkel ovnsbakt laks med sitron og sesonggrønnsaker. Sunn og rask hverdagsmiddag.', 4, 10, 20, 'Fisk', 'dinner', 'published', ARRAY['fisk'], ARRAY['glutenfri', 'laktosefri'], ARRAY['Forvarm ovnen til 200°C', 'Legg laksefileter i en ildfast form', 'Skjær grønnsaker (brokkoli, gulrot, squash) i biter', 'Fordel grønnsakene rundt laksen', 'Drypp over olivenolje og sitronsaft', 'Krydre med salt, pepper og dill', 'Stek i 18-20 minutter til laksen er gjennomstekt']),

('Kyllingwok med grønnsaker', 'Fargerik og sunn wok med kylling og ferske grønnsaker. Klar på 20 minutter.', 4, 10, 10, 'Kylling', 'dinner', 'published', ARRAY[]::text[], ARRAY['glutenfri', 'laktosefri'], ARRAY['Skjær kyllingfilet i strimler', 'Kutt paprika, brokkoli, gulrot og vårløk', 'Varm opp olje i wok på høy varme', 'Stek kyllingen i 3-4 minutter', 'Tilsett grønnsaker og stek i 4-5 minutter', 'Smak til med hvitløk, ingefær og litt soyasaus', 'Server straks, gjerne med ris']),

('Bakt torsk med urtesmør', 'Saftig torsk med hjemmelaget urtesmør. Enkelt og elegant.', 4, 10, 15, 'Fisk', 'dinner', 'published', ARRAY['fisk', 'melk'], ARRAY['glutenfri'], ARRAY['Forvarm ovnen til 200°C', 'Bland mykt smør med hakket persille, dill og sitronskall', 'Legg torskefileter i ildfast form', 'Fordel urtesmør på toppen', 'Stek i 12-15 minutter', 'Server med kokte poteter og grønnsaker']),

-- Vegetar
('Quinoasalat med ovnsbakte grønnsaker', 'Proteinrik og mettende salat med quinoa og karamelliserte grønnsaker.', 4, 15, 25, 'Vegetar', 'dinner', 'published', ARRAY[]::text[], ARRAY['vegansk', 'glutenfri'], ARRAY['Forvarm ovnen til 220°C', 'Kok quinoa etter anvisning på pakken', 'Kutt søtpotet, rødbeter og løk i biter', 'Vend grønnsakene i olje og krydder', 'Stek i ovnen i 20-25 minutter', 'Bland quinoa med ovnsbakte grønnsaker', 'Topp med friske urter og sitrondressing']),

('Omelett med urter og grønnsaker', 'Rask og proteinrik omelett fylt med friske grønnsaker.', 2, 5, 10, 'Vegetar', 'dinner', 'published', ARRAY['egg'], ARRAY['glutenfri', 'vegetar'], ARRAY['Pisk sammen egg med litt vann', 'Tilsett salt, pepper og friske urter', 'Stek spinat og tomater i en stekepanne', 'Hell over eggeblandingen', 'La steke på middels varme til bunnen stivner', 'Brett omeletten og server straks']),

('Grønnsakscurry med kikerter', 'Kremet og smakfull curry med kikerter og grønnsaker. Vegansk favoritt.', 4, 10, 20, 'Vegetar', 'dinner', 'published', ARRAY[]::text[], ARRAY['vegansk', 'glutenfri'], ARRAY['Fres løk og hvitløk i olje', 'Tilsett currypasta og stek i 1 minutt', 'Ha i kokosmelk og la småkoke', 'Tilsett kikerter og grønnsaker', 'La putre i 15-20 minutter', 'Smak til med lime og koriander', 'Server med ris eller naanbrød']),

-- Kjøtt
('Biffstrimler med paprika', 'Saftige biffstrimler med fargerik paprika. Rask og smakfull.', 4, 10, 10, 'Kjøtt', 'dinner', 'published', ARRAY[]::text[], ARRAY['glutenfri', 'laktosefri'], ARRAY['Skjær biffen i tynne strimler', 'Krydre med salt og pepper', 'Stek kjøttet på høy varme i 2-3 minutter', 'Ta ut kjøttet og stek paprikastrimler', 'Tilsett hvitløk og kjøttet tilbake', 'Server med ris eller poteter']),

('Kyllingspyd med tzatziki', 'Gresk-inspirerte kyllingspyd med hjemmelaget tzatziki.', 4, 15, 12, 'Kylling', 'dinner', 'published', ARRAY['melk'], ARRAY['glutenfri'], ARRAY['Skjær kylling i terninger', 'Marin i olivenolje, sitron og oregano', 'Tre på grillspyd', 'Grill eller stek i panne i 10-12 minutter', 'Lag tzatziki: bland yoghurt, agurk, hvitløk', 'Server spydene med tzatziki og salat']),

-- Supper
('Grønnsakssuppe med urter', 'Hjemmelaget grønnsakssuppe full av vitaminer. Perfekt for travle dager.', 4, 15, 20, 'Suppe', 'dinner', 'published', ARRAY[]::text[], ARRAY['vegansk', 'glutenfri'], ARRAY['Fres løk, gulrot og selleri i en gryte', 'Tilsett poteter og andre grønnsaker', 'Ha i grønnsaksbuljong og la koke', 'La småkoke i 15-20 minutter', 'Smak til med friske urter', 'Server med godt brød']),

('Kremet blomkålsuppe', 'Silkemyk og sunn blomkålsuppe. Lav i karbohydrater.', 4, 10, 20, 'Suppe', 'dinner', 'published', ARRAY['melk'], ARRAY['vegetar', 'glutenfri'], ARRAY['Del blomkålen i buketter', 'Kok blomkål i buljong til myk', 'Tilsett hvitløk og løk', 'Blend til glatt konsistens', 'Tilsett litt fløte eller melk', 'Smak til med muskatnøtt og pepper']);

-- Insert ingredients for the new recipes
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT r.id, i.name, i.quantity, i.unit, i.allergens
FROM recipes r
CROSS JOIN LATERAL (
  VALUES
    -- Sitronbakt laks
    ('Sitronbakt laks med grønnsaker', 'Laksefilet', '600', 'g', ARRAY['fisk']),
    ('Sitronbakt laks med grønnsaker', 'Brokkoli', '300', 'g', ARRAY[]::text[]),
    ('Sitronbakt laks med grønnsaker', 'Gulrot', '2', 'stk', ARRAY[]::text[]),
    ('Sitronbakt laks med grønnsaker', 'Squash', '1', 'stk', ARRAY[]::text[]),
    ('Sitronbakt laks med grønnsaker', 'Sitron', '1', 'stk', ARRAY[]::text[]),
    ('Sitronbakt laks med grønnsaker', 'Olivenolje', '3', 'ss', ARRAY[]::text[]),
    ('Sitronbakt laks med grønnsaker', 'Fersk dill', '1', 'bunt', ARRAY[]::text[]),
    
    -- Kyllingwok
    ('Kyllingwok med grønnsaker', 'Kyllingfilet', '500', 'g', ARRAY[]::text[]),
    ('Kyllingwok med grønnsaker', 'Paprika', '2', 'stk', ARRAY[]::text[]),
    ('Kyllingwok med grønnsaker', 'Brokkoli', '200', 'g', ARRAY[]::text[]),
    ('Kyllingwok med grønnsaker', 'Gulrot', '2', 'stk', ARRAY[]::text[]),
    ('Kyllingwok med grønnsaker', 'Vårløk', '4', 'stk', ARRAY[]::text[]),
    ('Kyllingwok med grønnsaker', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
    ('Kyllingwok med grønnsaker', 'Fersk ingefær', '2', 'cm', ARRAY[]::text[]),
    
    -- Bakt torsk
    ('Bakt torsk med urtesmør', 'Torskefilet', '600', 'g', ARRAY['fisk']),
    ('Bakt torsk med urtesmør', 'Smør', '80', 'g', ARRAY['melk']),
    ('Bakt torsk med urtesmør', 'Fersk persille', '1', 'bunt', ARRAY[]::text[]),
    ('Bakt torsk med urtesmør', 'Fersk dill', '1', 'bunt', ARRAY[]::text[]),
    ('Bakt torsk med urtesmør', 'Sitron', '1', 'stk', ARRAY[]::text[]),
    
    -- Quinoasalat
    ('Quinoasalat med ovnsbakte grønnsaker', 'Quinoa', '300', 'g', ARRAY[]::text[]),
    ('Quinoasalat med ovnsbakte grønnsaker', 'Søtpotet', '2', 'stk', ARRAY[]::text[]),
    ('Quinoasalat med ovnsbakte grønnsaker', 'Rødbeter', '2', 'stk', ARRAY[]::text[]),
    ('Quinoasalat med ovnsbakte grønnsaker', 'Rødløk', '1', 'stk', ARRAY[]::text[]),
    ('Quinoasalat med ovnsbakte grønnsaker', 'Olivenolje', '3', 'ss', ARRAY[]::text[]),
    
    -- Omelett
    ('Omelett med urter og grønnsaker', 'Egg', '6', 'stk', ARRAY['egg']),
    ('Omelett med urter og grønnsaker', 'Spinat', '100', 'g', ARRAY[]::text[]),
    ('Omelett med urter og grønnsaker', 'Cherrytomater', '100', 'g', ARRAY[]::text[]),
    ('Omelett med urter og grønnsaker', 'Friske urter', '1', 'bunt', ARRAY[]::text[]),
    
    -- Grønnsakscurry
    ('Grønnsakscurry med kikerter', 'Kikerter', '400', 'g', ARRAY[]::text[]),
    ('Grønnsakscurry med kikerter', 'Kokosmelk', '400', 'ml', ARRAY[]::text[]),
    ('Grønnsakscurry med kikerter', 'Currypasta', '2', 'ss', ARRAY[]::text[]),
    ('Grønnsakscurry med kikerter', 'Løk', '1', 'stk', ARRAY[]::text[]),
    ('Grønnsakscurry med kikerter', 'Hvitløk', '3', 'fedd', ARRAY[]::text[]),
    ('Grønnsakscurry med kikerter', 'Paprika', '1', 'stk', ARRAY[]::text[]),
    ('Grønnsakscurry med kikerter', 'Spinat', '100', 'g', ARRAY[]::text[]),
    
    -- Biffstrimler
    ('Biffstrimler med paprika', 'Biffkjøtt', '500', 'g', ARRAY[]::text[]),
    ('Biffstrimler med paprika', 'Paprika', '3', 'stk', ARRAY[]::text[]),
    ('Biffstrimler med paprika', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
    ('Biffstrimler med paprika', 'Olivenolje', '2', 'ss', ARRAY[]::text[]),
    
    -- Kyllingspyd
    ('Kyllingspyd med tzatziki', 'Kyllingfilet', '600', 'g', ARRAY[]::text[]),
    ('Kyllingspyd med tzatziki', 'Gresk yoghurt', '200', 'g', ARRAY['melk']),
    ('Kyllingspyd med tzatziki', 'Agurk', '0.5', 'stk', ARRAY[]::text[]),
    ('Kyllingspyd med tzatziki', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
    ('Kyllingspyd med tzatziki', 'Sitron', '1', 'stk', ARRAY[]::text[]),
    ('Kyllingspyd med tzatziki', 'Tørket oregano', '1', 'ts', ARRAY[]::text[]),
    
    -- Grønnsakssuppe
    ('Grønnsakssuppe med urter', 'Løk', '1', 'stk', ARRAY[]::text[]),
    ('Grønnsakssuppe med urter', 'Gulrot', '3', 'stk', ARRAY[]::text[]),
    ('Grønnsakssuppe med urter', 'Selleri', '2', 'stk', ARRAY[]::text[]),
    ('Grønnsakssuppe med urter', 'Poteter', '3', 'stk', ARRAY[]::text[]),
    ('Grønnsakssuppe med urter', 'Grønnsaksbuljong', '1', 'l', ARRAY[]::text[]),
    ('Grønnsakssuppe med urter', 'Friske urter', '1', 'bunt', ARRAY[]::text[]),
    
    -- Blomkålsuppe
    ('Kremet blomkålsuppe', 'Blomkål', '1', 'stk', ARRAY[]::text[]),
    ('Kremet blomkålsuppe', 'Løk', '1', 'stk', ARRAY[]::text[]),
    ('Kremet blomkålsuppe', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
    ('Kremet blomkålsuppe', 'Grønnsaksbuljong', '600', 'ml', ARRAY[]::text[]),
    ('Kremet blomkålsuppe', 'Melk eller fløte', '100', 'ml', ARRAY['melk'])
) AS i(recipe_title, name, quantity, unit, allergens)
WHERE r.title = i.recipe_title;
