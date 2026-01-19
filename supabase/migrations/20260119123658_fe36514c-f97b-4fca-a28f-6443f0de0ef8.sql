-- Legg til flere middagsoppskrifter med fokus på renvarer

-- 1. Ovnsbakt kyllinglår med rotgrønnsaker
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Ovnsbakt kyllinglår med rotgrønnsaker',
  'Saftige kyllinglår med sprø skinn og karamelliserte rotgrønnsaker. En klassiker!',
  'Kylling',
  'dinner',
  'published',
  4,
  15,
  50,
  ARRAY[
    'Forvarm ovnen til 200°C.',
    'Skjær gulrøtter, pastinakk og sellerirot i grove biter.',
    'Legg grønnsakene i en ildfast form med litt olivenolje, salt og pepper.',
    'Krydre kyllinglårene med salt, pepper og paprika.',
    'Legg kyllinglårene oppå grønnsakene.',
    'Stek i ovnen i 45-50 minutter til kyllingen er gjennomstekt og skinnet er sprøtt.',
    'La hvile 5 minutter før servering.'
  ],
  ARRAY[]::text[],
  ARRAY['glutenfri', 'melkefri']::text[],
  520,
  38.0,
  32.0,
  18.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Kyllinglår', '8', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Gulrøtter', '4', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Pastinakk', '2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Sellerirot', '1/2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '3', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Paprika (krydder)', '1', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Timian', '1', 'ts', ARRAY[]::text[], true FROM recipes WHERE title = 'Ovnsbakt kyllinglår med rotgrønnsaker';

-- 2. Enkel omelett med grønnsaker
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Omelett med grønnsaker',
  'Proteinrik frokost eller lunsj med ferske grønnsaker. Rask og næringsrik!',
  'Egg',
  'dinner',
  'published',
  2,
  5,
  8,
  ARRAY[
    'Pisk sammen eggene med en klype salt og pepper.',
    'Finhakk paprika, tomat og vårløk.',
    'Varm smør i en stekepanne på middels varme.',
    'Hell i eggeblandingen og la stivne i bunnen.',
    'Strø grønnsakene over halve omeletten.',
    'Brett omeletten sammen og stek til ønsket konsistens.',
    'Server umiddelbart.'
  ],
  ARRAY['egg']::text[],
  ARRAY['vegetarisk', 'glutenfri', 'lavkarbo']::text[],
  280,
  18.0,
  20.0,
  6.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Egg', '4', 'stk', ARRAY['egg']::text[], false FROM recipes WHERE title = 'Omelett med grønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Paprika', '1/2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Omelett med grønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Tomat', '1', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Omelett med grønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Vårløk', '2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Omelett med grønnsaker';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Smør', '1', 'ss', ARRAY['melk']::text[], false FROM recipes WHERE title = 'Omelett med grønnsaker';

-- 3. Bakt søtpotet med cottage cheese
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Bakt søtpotet med cottage cheese',
  'Mettende og næringsrik middag med naturlig søthet fra søtpoteten.',
  'Vegetar',
  'dinner',
  'published',
  2,
  5,
  45,
  ARRAY[
    'Forvarm ovnen til 200°C.',
    'Stikk hull i søtpotetene med en gaffel.',
    'Bak søtpotetene i ovnen i ca. 45 minutter til de er myke.',
    'Skjær et snitt i toppen og klem forsiktig for å åpne.',
    'Topp med cottage cheese, hakket vårløk og solsikkefrø.',
    'Krydre med salt og pepper etter smak.'
  ],
  ARRAY['melk']::text[],
  ARRAY['vegetarisk', 'glutenfri']::text[],
  320,
  15.0,
  8.0,
  48.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Søtpotet', '2', 'store', ARRAY[]::text[], false FROM recipes WHERE title = 'Bakt søtpotet med cottage cheese';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Cottage cheese', '200', 'g', ARRAY['melk']::text[], false FROM recipes WHERE title = 'Bakt søtpotet med cottage cheese';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Vårløk', '2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Bakt søtpotet med cottage cheese';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Solsikkefrø', '2', 'ss', ARRAY[]::text[], true FROM recipes WHERE title = 'Bakt søtpotet med cottage cheese';

-- 4. Enkel linsesuppe
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Krydret linsesuppe',
  'Varmende og proteinrik suppe med røde linser og hjemmelagde krydder.',
  'Supper',
  'dinner',
  'published',
  6,
  10,
  30,
  ARRAY[
    'Finhakk løk og hvitløk.',
    'Fres løk og hvitløk i olivenolje til de er myke.',
    'Tilsett gurkemeie, spisskummen og paprika. Stek i 1 minutt.',
    'Tilsett røde linser, hermetiske tomater og grønnsaksbuljong.',
    'La småkoke i 25-30 minutter til linsene er myke.',
    'Smak til med salt og pepper.',
    'Server med frisk koriander og en klatt yoghurt.'
  ],
  ARRAY[]::text[],
  ARRAY['vegansk', 'glutenfri', 'melkefri']::text[],
  220,
  12.0,
  5.0,
  32.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Røde linser', '300', 'g', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hvitløk', '3', 'fedd', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hermetiske tomater', '400', 'g', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Grønnsaksbuljong', '1', 'liter', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Gurkemeie', '1', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Spisskummen', '1', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Krydret linsesuppe';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Koriander', '1', 'bunt', ARRAY[]::text[], true FROM recipes WHERE title = 'Krydret linsesuppe';

-- 5. Stekt egg med avokado og tomat
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Stekt egg med avokado og tomat',
  'Enkel og sunn frokost eller lunsj med sunne fettsyrer.',
  'Egg',
  'dinner',
  'published',
  1,
  5,
  5,
  ARRAY[
    'Skjær avokadoen i to og fjern steinen.',
    'Skjær tomaten i skiver.',
    'Stek eggene i olivenolje til ønsket konsistens.',
    'Anrett egg, avokado og tomat på en tallerken.',
    'Dryss over salt, pepper og chiliflak.'
  ],
  ARRAY['egg']::text[],
  ARRAY['vegetarisk', 'glutenfri', 'melkefri', 'lavkarbo']::text[],
  350,
  14.0,
  28.0,
  10.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Egg', '2', 'stk', ARRAY['egg']::text[], false FROM recipes WHERE title = 'Stekt egg med avokado og tomat';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Avokado', '1/2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Stekt egg med avokado og tomat';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Tomat', '1', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Stekt egg med avokado og tomat';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '1', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Stekt egg med avokado og tomat';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Chiliflak', '1', 'klype', ARRAY[]::text[], true FROM recipes WHERE title = 'Stekt egg med avokado og tomat';

-- 6. Gresk salat med kylling
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Gresk salat med kylling',
  'Frisk og mettende salat med saftig kylling og fetaost.',
  'Kylling',
  'dinner',
  'published',
  2,
  15,
  12,
  ARRAY[
    'Krydre kyllingfiletene med salt, pepper og oregano.',
    'Stek kyllingen i olivenolje i 5-6 minutter på hver side.',
    'La kyllingen hvile i 5 minutter, skjær deretter i skiver.',
    'Skjær agurk, tomat og rødløk i biter.',
    'Bland grønnsakene med oliven og fetaost.',
    'Legg kyllingskivene oppå salaten.',
    'Dryss over olivenolje og sitronsaft.'
  ],
  ARRAY['melk']::text[],
  ARRAY['glutenfri', 'lavkarbo']::text[],
  420,
  42.0,
  24.0,
  12.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Kyllingfilet', '2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Agurk', '1/2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Tomat', '2', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Rødløk', '1/4', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Fetaost', '100', 'g', ARRAY['melk']::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Svarte oliven', '50', 'g', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Oregano', '1', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Gresk salat med kylling';

-- 7. Enkel bønnegryte
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Enkel bønnegryte',
  'Proteinrik og mettende vegetargryte med hvite bønner og tomater.',
  'Vegetar',
  'dinner',
  'published',
  4,
  10,
  25,
  ARRAY[
    'Finhakk løk og hvitløk.',
    'Fres i olivenolje til de er gylne.',
    'Tilsett hermetiske tomater og la småkoke i 5 minutter.',
    'Tilsett avrent hvite bønner.',
    'Krydre med rosmarin, salt og pepper.',
    'La småkoke i 15 minutter.',
    'Server med frisk basilikum på toppen.'
  ],
  ARRAY[]::text[],
  ARRAY['vegansk', 'glutenfri', 'melkefri']::text[],
  240,
  12.0,
  6.0,
  36.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hvite bønner', '2', 'bokser', ARRAY[]::text[], false FROM recipes WHERE title = 'Enkel bønnegryte';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hermetiske tomater', '400', 'g', ARRAY[]::text[], false FROM recipes WHERE title = 'Enkel bønnegryte';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Enkel bønnegryte';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hvitløk', '2', 'fedd', ARRAY[]::text[], false FROM recipes WHERE title = 'Enkel bønnegryte';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Rosmarin', '1', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Enkel bønnegryte';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Enkel bønnegryte';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Basilikum', '1', 'håndfull', ARRAY[]::text[], true FROM recipes WHERE title = 'Enkel bønnegryte';

-- 8. DIY: Hjemmelaget hummus
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, replaces)
VALUES (
  'Hjemmelaget hummus',
  'Kremete og smakfull hummus uten tilsetningsstoffer.',
  'Pålegg',
  'diy',
  'published',
  8,
  10,
  0,
  ARRAY[
    'Hell av væsken fra kikertsene (behold litt).',
    'Ha kikerter, tahini, hvitløk, sitronsaft og olivenolje i en foodprosessor.',
    'Kjør til glatt, tilsett litt av kikertvannet for ønsket konsistens.',
    'Smak til med salt og spisskummen.',
    'Overfør til en skål og dryss over olivenolje og paprika.'
  ],
  ARRAY['sesam']::text[],
  ARRAY['vegansk', 'glutenfri', 'melkefri']::text[],
  120,
  5.0,
  7.0,
  10.0,
  'Ferdig hummus'
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Kikerter', '400', 'g boks', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget hummus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Tahini', '3', 'ss', ARRAY['sesam']::text[], false FROM recipes WHERE title = 'Hjemmelaget hummus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hvitløk', '2', 'fedd', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget hummus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Sitronsaft', '2', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget hummus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget hummus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Spisskummen', '1/2', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget hummus';

-- 9. DIY: Havregrøt med banan og kanel
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, replaces)
VALUES (
  'Havregrøt med banan og kanel',
  'Varmende og mettende frokost med naturlig søthet fra banan.',
  'Frokost',
  'diy',
  'published',
  1,
  2,
  5,
  ARRAY[
    'Kok opp vann eller melk i en kjele.',
    'Rør inn havregryn og la koke i 3-4 minutter under omrøring.',
    'Mos halvparten av bananen og rør inn i grøten.',
    'Hell grøten i en skål.',
    'Topp med resten av bananen i skiver og dryss kanel over.'
  ],
  ARRAY['gluten']::text[],
  ARRAY['vegetarisk', 'melkefri']::text[],
  320,
  10.0,
  5.0,
  58.0,
  'Ferdig frokostblanding'
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Havregryn', '1', 'dl', ARRAY['gluten']::text[], false FROM recipes WHERE title = 'Havregrøt med banan og kanel';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Vann eller melk', '2', 'dl', ARRAY[]::text[], false FROM recipes WHERE title = 'Havregrøt med banan og kanel';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Banan', '1', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Havregrøt med banan og kanel';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Kanel', '1/2', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Havregrøt med banan og kanel';

-- 10. DIY: Hjemmelaget mandelmjølk
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, replaces)
VALUES (
  'Hjemmelaget mandelmelk',
  'Kremete og naturlig plantemelk uten tilsatt sukker eller tilsetningsstoffer.',
  'Drikke',
  'diy',
  'published',
  8,
  10,
  0,
  ARRAY[
    'Bløtlegg mandler i vann over natten (eller minst 8 timer).',
    'Hell av vannet og skyll mandlene.',
    'Ha mandler og 1 liter friskt vann i en blender.',
    'Blend på høy hastighet i 1-2 minutter.',
    'Sil gjennom en nøttemelkpose eller klede.',
    'Oppbevar i kjøleskap i opptil 4 dager.',
    'Rist før bruk.'
  ],
  ARRAY['nøtter']::text[],
  ARRAY['vegansk', 'glutenfri', 'melkefri']::text[],
  30,
  1.0,
  2.5,
  1.0,
  'Kjøpt plantemelk'
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Mandler', '150', 'g', ARRAY['nøtter']::text[], false FROM recipes WHERE title = 'Hjemmelaget mandelmelk';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Vann', '1', 'liter', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget mandelmelk';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Vaniljeekstrakt', '1/2', 'ts', ARRAY[]::text[], true FROM recipes WHERE title = 'Hjemmelaget mandelmelk';

-- 11. Base: Hjemmelaget tomatpuré
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES (
  'Hjemmelaget tomatsaus',
  'Enkel og allsidig tomatsaus fra bunnen av. Perfekt til pasta og pizza.',
  'Sauser',
  'base',
  'published',
  8,
  10,
  45,
  ARRAY[
    'Finhakk løk og hvitløk.',
    'Fres i olivenolje på middels varme til de er myke.',
    'Tilsett hermetiske tomater og la småkoke.',
    'Tilsett basilikum og oregano.',
    'La småkoke i 30-40 minutter til sausen er tykk.',
    'Smak til med salt og pepper.',
    'Blend til glatt konsistens om ønsket.'
  ],
  ARRAY[]::text[],
  ARRAY['vegansk', 'glutenfri', 'melkefri']::text[],
  45,
  1.0,
  2.0,
  6.0
);

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hermetiske tomater', '800', 'g', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget tomatsaus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget tomatsaus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Hvitløk', '3', 'fedd', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget tomatsaus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget tomatsaus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Basilikum', '1', 'ts tørket', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget tomatsaus';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Oregano', '1', 'ts', ARRAY[]::text[], false FROM recipes WHERE title = 'Hjemmelaget tomatsaus';