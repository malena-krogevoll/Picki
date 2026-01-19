-- Insert new recipes

-- 1. Kyllingpasta med linser og grønnsaker (Dinner)
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Kyllingpasta med linser og grønnsaker',
  'Mettende one-pot pasta med saftig kylling, linser og masse grønnsaker. Perfekt til meal prep!',
  'Kylling',
  'dinner',
  'published',
  20,
  90,
  8,
  ARRAY[
    'Kutt opp løk, squash, hvitløk og gulrot.',
    'Ha grønnsakene i en gryte sammen med kyllingfilet, tomatsaus, buljong, honning og pesto.',
    'Hell i nok vann til å dekke kyllingen. La småkoke under lokk på lav varme i 1-3 timer.',
    'Ta ut kyllingen og riv den i strimler med en gaffel.',
    'Stavmiks grønnsakene i kjelen. Tilsett eventuelt linser her om du vil ha jevnere konsistens.',
    'Tilsett pasta til grønnsakssausen og la småkoke til passelig konsistens.',
    'Tilsett spinat, revet kylling og linser. Bland godt.',
    'Topp med fetaost, parmesan og krydder etter ønske.'
  ],
  ARRAY['gluten', 'melk'],
  ARRAY['høyprotein'],
  NULL
);

-- 2. Proteinpizza med kyllingbunn (Dinner)
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Proteinpizza med kyllingbunn',
  'Proteinrik pizza med bunn laget av kyllingkjøttdeig. Hele pizzaen gir 165g protein!',
  'Kylling',
  'dinner',
  'published',
  15,
  35,
  2,
  ARRAY[
    'Forvarm ovnen til 200°C.',
    'Bland kyllingkjøttdeig, egg og parmesan godt i en bolle.',
    'Smør blandingen utover til et tynt lag på et bakepapir.',
    'Stek i ovnen i 23-25 minutter til bunnen er gyllen.',
    'Ta ut og topp med pizzasaus, ost, salami og cherrytomater.',
    'Sett tilbake i ovnen i 10 minutter til osten er smeltet.',
    'Dryss over honning og chilliflak før servering.'
  ],
  ARRAY['egg', 'melk'],
  ARRAY['glutenfri', 'lavkarbo', 'høyprotein'],
  NULL
);

-- 3. Crispy rice salat med laks (Dinner)
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Crispy rice salat med laks',
  'Frisk salat med sprø ovnsbakt ris, saftig laks og asiatisk dressing. Perfekt måte å bruke opp resteRIS!',
  'Fisk',
  'dinner',
  'published',
  20,
  45,
  2,
  ARRAY[
    'Forvarm ovnen til 200°C.',
    'Legg kokt ris i en form med bakepapir. Dryss over soyasaus, sriracha, hvitløk og olje. Bland og fordel jevnt.',
    'Stek risen i ovnen i ca. 45 minutter til den er sprø.',
    'Legg laksefiletene i en form, hell over soyasaus og stek i 12 minutter.',
    'Lag dressing: Bland finhakket hvitløk, revet ingefær, ponzu, eplesidereddik, honning og peanøttsmør.',
    'Finhakk vårløk og koriander. Skjær agurk i tynne skiver. Kok edamamebønnene i 2-3 minutter.',
    'Del avokado i terninger.',
    'Fordel grønnsaker og laks i skåler, hell over dressing og topp med sprø ris.',
    'Skvis over lime ved servering og nyt!'
  ],
  ARRAY['fisk', 'soya', 'peanøtter'],
  ARRAY['meierifri'],
  NULL
);

-- 4. Yoghurtlefser (DIY - replaces tortillas/pita)
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Yoghurtlefser',
  'Myke lefser med bare 3 ingredienser! Perfekt erstatning for tortilla, lomper eller pitabrød.',
  'Bakst',
  'diy',
  'published',
  15,
  10,
  4,
  ARRAY[
    'Bland yoghurt, det meste av hvetemelet og salt i en bolle.',
    'Elt sammen til en myk, men ikke klebrig deig. Tilsett mer mel om nødvendig.',
    'Del deigen i fire like store deler.',
    'Dryss mel på benken og kjevle ut hver del så tynt som mulig.',
    'Stek en og en lefse på takke eller i tørr stekepanne.',
    'Snu lefsene når de får brune flekker og stek ferdig på andre siden.',
    'Hold lefsene varme i et rent kjøkkenhåndkle.',
    'Fyll med det du liker best - kan brukes som tortilla, lompe, pita eller chapati.'
  ],
  ARRAY['gluten', 'melk'],
  ARRAY['vegetarisk'],
  'Tortilla, lomper, pitabrød og chapati'
);

-- 5. Bakt søtpotet med bønner og feta (Dinner - Vegetar)
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Bakt søtpotet med bønner og feta',
  'Enkel og næringsrik vegetarrett med bakt søtpotet, krydrede bønner og kremet yoghurtdressing.',
  'Vegetar',
  'dinner',
  'published',
  10,
  60,
  1,
  ARRAY[
    'Forvarm ovnen til 200°C.',
    'Bak søtpoteten hel i ca. 60 minutter til den er helt myk.',
    'Varm bønnene forsiktig med litt vann, røkt paprika, spisskummen og salt.',
    'Rør yoghurt sammen med sitronsaft, litt finrevet skall og salt.',
    'Del søtpoteten på langs.',
    'Topp med varme bønner, fetaost, syltet rødkål og yoghurtdressing.',
    'Avslutt med spirer og en rett olivenolje.'
  ],
  ARRAY['melk'],
  ARRAY['vegetarisk', 'glutenfri'],
  NULL
);

-- 6. Hjemmelaget jordbærsyltetøy (DIY)
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Hjemmelaget jordbærsyltetøy',
  'Sunt syltetøy uten tilsatt sukker! Bruker chiafrø som naturlig tykningsmiddel og aprikosmos for sødme.',
  'Pålegg',
  'diy',
  'published',
  10,
  5,
  10,
  ARRAY[
    'Ha frosne jordbær i en kasserolle.',
    'Fyll vann så bærene er halvveis dekket.',
    'La koke på medium varme i 2 minutter etter at bærene er tint.',
    'Stavmiks bærene med kokevannet.',
    'Rør inn chiafrø og aprikosmos (eller bløtlagte aprikoser/dadler).',
    'Avkjøl og la det svelle i kjøleskapet i 8-12 timer før servering.',
    'Oppbevar i kjøleskapet eller frys i porsjoner.'
  ],
  ARRAY[]::text[],
  ARRAY['vegansk', 'glutenfri', 'sukkerfri'],
  'Vanlig syltetøy med tilsatt sukker'
);

-- Now insert ingredients for each recipe

-- Ingredients for Kyllingpasta med linser og grønnsaker
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kyllingfilet', '700', 'g', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Røde linser', '2', 'bokser', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Knuste tomater', '3', 'bokser', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pasta', '500', 'g', ARRAY['gluten']
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Squash', '1', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Gulrøtter', '3', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '8-10', 'fedd', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk spinat', '1/2', 'pose', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Buljongterninger', '2', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Honning', '1', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pesto', '2', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fetaost', '1', 'boks', ARRAY['melk']
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Parmesan', NULL, NULL, ARRAY['melk']
FROM recipes WHERE title = 'Kyllingpasta med linser og grønnsaker' AND recipe_type = 'dinner';

-- Ingredients for Proteinpizza med kyllingbunn
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kyllingkjøttdeig', '400', 'g', ARRAY[]::text[]
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Egg', '2', 'stk', ARRAY['egg']
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Parmesan', '80', 'g', ARRAY['melk']
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pizzasaus', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Lett ost', NULL, NULL, ARRAY['melk']
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Salami eller chorizo', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Cherrytomater', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Honning', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Chilliflak', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Proteinpizza med kyllingbunn' AND recipe_type = 'dinner';

-- Ingredients for Crispy rice salat med laks
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Ris (tørr)', '120-150', 'g', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Soyasaus', '2', 'ss', ARRAY['soya']
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sriracha', '1', 'ts', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '4', 'fedd', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olje', '1', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Laksefilet', '2', 'stk', ARRAY['fisk']
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Vårløk', '3', 'stilker', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Agurk', '1/2', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Edamamebønner', '200', 'g', ARRAY['soya']
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Avokado', '1', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk koriander', '2', 'never', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Ingefær (revet)', '1', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Ponzu', '4', 'ss', ARRAY['soya']
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Eplesidereddik', '3', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Honning', '1', 'ts', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Peanøttsmør', '1', 'ss', ARRAY['peanøtter']
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Lime', '1', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Crispy rice salat med laks' AND recipe_type = 'dinner';

-- Ingredients for Yoghurtlefser
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Gresk eller tyrkisk yoghurt', '3', 'dl', ARRAY['melk']
FROM recipes WHERE title = 'Yoghurtlefser' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvetemel', '3', 'dl', ARRAY['gluten']
FROM recipes WHERE title = 'Yoghurtlefser' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Salt', '0,5', 'ts', ARRAY[]::text[], true
FROM recipes WHERE title = 'Yoghurtlefser' AND recipe_type = 'diy';

-- Ingredients for Bakt søtpotet med bønner og feta
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Søtpotet', '250', 'g', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sorte bønner (kokte)', '60', 'g', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fetaost', '40', 'g', ARRAY['melk']
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Syltet rødkål', '50', 'g', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Yoghurt naturell', '100', 'g', ARRAY['melk']
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '1', 'ts', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Røkt paprika', '1/4', 'ts', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Spisskummen', '1/4', 'ts', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron', '1/2', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Spirer', '1', 'håndfull', ARRAY[]::text[], true
FROM recipes WHERE title = 'Bakt søtpotet med bønner og feta' AND recipe_type = 'dinner';

-- Ingredients for Hjemmelaget jordbærsyltetøy
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Frosne jordbær', '2', 'pk', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelaget jordbærsyltetøy' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Chiafrø', '2', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelaget jordbærsyltetøy' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Aprikosmos', '1/5', 'dl', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelaget jordbærsyltetøy' AND recipe_type = 'diy';