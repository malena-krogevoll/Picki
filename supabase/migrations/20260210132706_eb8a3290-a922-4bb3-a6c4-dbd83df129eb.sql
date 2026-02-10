
-- Viral recipe 1: Smashed burger
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Smash burger med karamellisert løk', 'Den virale smash burgeren – tynn, sprø og utrolig saftig med karamellisert løk', 4, 15, 15, 'Kjøtt', 'dinner', 'published', ARRAY['gluten','melk','egg','sennep'], ARRAY[]::text[], ARRAY[
  'Del kjøttdeigen i 8 like kuler (ca 60g hver).',
  'Skjær løk i tynne ringer og karamelliser i smør på lav varme i 15 min.',
  'Varm opp en støpejernspanne på høy varme.',
  'Legg en kjøttball på pannen og press den helt flat med en spatel.',
  'Krydre med salt og pepper, stek i 2-3 min til kantene er sprø.',
  'Snu, legg på ost og la den smelte.',
  'Toast burgerbrødene i pannen.',
  'Bygg burgeren: brød, saus, salat, 2 kjøttskiver med ost, karamellisert løk, brød.'
], 520, 32, 28, 38);

-- Get the ID for ingredients
WITH burger AS (SELECT id FROM recipes WHERE title = 'Smash burger med karamellisert løk' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM burger), 'Kjøttdeig', '500', 'g', ARRAY[]::text[]),
  ((SELECT id FROM burger), 'Løk', '2', 'stk', ARRAY[]::text[]),
  ((SELECT id FROM burger), 'Smør', '2', 'ss', ARRAY['melk']),
  ((SELECT id FROM burger), 'Cheddarost', '8', 'skiver', ARRAY['melk']),
  ((SELECT id FROM burger), 'Burgerbrød', '4', 'stk', ARRAY['gluten','egg']),
  ((SELECT id FROM burger), 'Salt', '', '', ARRAY[]::text[]),
  ((SELECT id FROM burger), 'Pepper', '', '', ARRAY[]::text[]),
  ((SELECT id FROM burger), 'Salat', '4', 'blad', ARRAY[]::text[]);

-- Viral recipe 2: Baked feta pasta
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Bakt feta-pasta', 'Den virale TikTok-pastaen med bakt feta og cherrytomater – enkel og utrolig god', 4, 10, 30, 'Pasta', 'dinner', 'published', ARRAY['gluten','melk'], ARRAY['vegetar'], ARRAY[
  'Forvarm ovnen til 200°C.',
  'Legg cherrytomater i en ildfast form, drypp over olivenolje, salt og pepper.',
  'Legg fetaosten midt i formen.',
  'Drypp olje over fetaen og dryss over hvitløk og chiliflaak.',
  'Bak i 30 minutter til tomatene har sprukket og fetaen er myk.',
  'Kok pastaen al dente etter anvisning.',
  'Mos feta og tomater sammen med en gaffel.',
  'Bland inn den varme pastaen og topp med fersk basilikum.'
], 450, 16, 18, 54);

WITH feta AS (SELECT id FROM recipes WHERE title = 'Bakt feta-pasta' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM feta), 'Cherrytomater', '500', 'g', ARRAY[]::text[]),
  ((SELECT id FROM feta), 'Fetaost', '200', 'g', ARRAY['melk']),
  ((SELECT id FROM feta), 'Pasta', '400', 'g', ARRAY['gluten']),
  ((SELECT id FROM feta), 'Olivenolje', '3', 'ss', ARRAY[]::text[]),
  ((SELECT id FROM feta), 'Hvitløk', '3', 'fedd', ARRAY[]::text[]),
  ((SELECT id FROM feta), 'Chiliflaak', '1', 'ts', ARRAY[]::text[]),
  ((SELECT id FROM feta), 'Fersk basilikum', '1', 'bunt', ARRAY[]::text[]),
  ((SELECT id FROM feta), 'Salt', '', '', ARRAY[]::text[]),
  ((SELECT id FROM feta), 'Pepper', '', '', ARRAY[]::text[]);

-- Viral recipe 3: Birria tacos
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Birria tacos', 'Virale meksikanske tacos med mørt, krydret kjøtt og consommé til dipping', 6, 30, 180, 'Kjøtt', 'dinner', 'published', ARRAY['gluten'], ARRAY[]::text[], ARRAY[
  'Brun kjøttet i en stor gryte med olje.',
  'Rist tørkede chili (ancho/guajillo) i en tørr panne, bløtlegg i varmt vann i 20 min.',
  'Blend chiliene med løk, hvitløk, tomater, spisskummen, oregano og pepper til en jevn saus.',
  'Hell sausen over kjøttet, tilsett buljong og la det småkoke under lokk i 3 timer.',
  'Dra kjøttet fra hverandre med to gafler.',
  'Dypp tortillaer i fettet fra gryten og stek dem i en panne.',
  'Fyll tortillaene med kjøtt, topp med hakket løk og koriander.',
  'Server med consommé (sjyen fra gryten) til dipping.'
], 480, 38, 22, 35);

WITH birria AS (SELECT id FROM recipes WHERE title = 'Birria tacos' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM birria), 'Storfekjøtt (høyrygg)', '1', 'kg', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Tørkede ancho-chili', '4', 'stk', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Tørkede guajillo-chili', '4', 'stk', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Løk', '2', 'stk', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Hvitløk', '6', 'fedd', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Tomater', '3', 'stk', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Spisskummen', '2', 'ts', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Oregano', '1', 'ts', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Storfekraftbuljong', '5', 'dl', ARRAY[]::text[]),
  ((SELECT id FROM birria), 'Hvetetortillaer', '12', 'stk', ARRAY['gluten']),
  ((SELECT id FROM birria), 'Fersk koriander', '1', 'bunt', ARRAY[]::text[]);

-- Viral recipe 4: Marry me chicken
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Marry me chicken', 'Den virale kremete kyllingretten med soltørkede tomater – så god at du vil fri!', 4, 10, 25, 'Kylling', 'dinner', 'published', ARRAY['melk'], ARRAY[]::text[], ARRAY[
  'Bank kyllingfiletene til jevn tykkelse, krydre med salt, pepper og paprika.',
  'Stek kyllingen i olivenolje til gyllen, ca 5 min per side. Ta ut.',
  'Stek hvitløk og soltørkede tomater i pannen i 1 minutt.',
  'Tilsett kyllingbuljong og fløte, kok opp.',
  'Rør inn parmesan og la sausen tykne litt.',
  'Legg kyllingen tilbake i sausen.',
  'Tilsett fersk basilikum og la det småkoke i 5-10 min.',
  'Server med pasta, ris eller godt brød.'
], 490, 42, 26, 18);

WITH marry AS (SELECT id FROM recipes WHERE title = 'Marry me chicken' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM marry), 'Kyllingfilet', '600', 'g', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Soltørkede tomater', '100', 'g', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Hvitløk', '4', 'fedd', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Fløte', '3', 'dl', ARRAY['melk']),
  ((SELECT id FROM marry), 'Kyllingbuljong', '1', 'dl', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Parmesan', '50', 'g', ARRAY['melk']),
  ((SELECT id FROM marry), 'Olivenolje', '2', 'ss', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Paprika (krydder)', '1', 'ts', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Fersk basilikum', '1', 'bunt', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Salt', '', '', ARRAY[]::text[]),
  ((SELECT id FROM marry), 'Pepper', '', '', ARRAY[]::text[]);

-- Viral recipe 5: Cloud bread
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Cloud bread', 'Viralt, luftig skybrød med bare 3 ingredienser – glutenfritt og lavkarbo', 8, 10, 25, 'Snacks', 'diy', 'published', ARRAY['egg','melk'], ARRAY['glutenfri','lavkarbo'], ARRAY[
  'Forvarm ovnen til 150°C.',
  'Skill eggehvitene fra plommene.',
  'Pisk eggehvitene stive med en klype salt.',
  'Rør sammen eggeplommene med kremost til en jevn masse.',
  'Fold forsiktig eggehvitene inn i eggeplommeblandingen.',
  'Fordel blandingen i runde hauger på et bakepapirkledd brett.',
  'Stek i 20-25 minutter til de er gylne.',
  'Avkjøl på rist – de blir luftige og litt seige.'
], 45, 4, 3, 2);

WITH cloud AS (SELECT id FROM recipes WHERE title = 'Cloud bread' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM cloud), 'Egg', '3', 'stk', ARRAY['egg']),
  ((SELECT id FROM cloud), 'Kremost', '3', 'ss', ARRAY['melk']),
  ((SELECT id FROM cloud), 'Salt', '1', 'klype', ARRAY[]::text[]);

-- Viral recipe 6: Butter board (smørbrett)
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Smørbrett (Butter board)', 'Det virale smørbrettet – kreativt og sosialt tilbehør til brød', 6, 15, 0, 'Snacks', 'diy', 'published', ARRAY['melk','gluten'], ARRAY['vegetar'], ARRAY[
  'La smøret bli romtemperert.',
  'Smør et tykt lag smør utover et trefjøl eller tallerken.',
  'Dryss over flaksalt, honning og ferske urter.',
  'Legg på soltørkede tomater, oliven og ristede nøtter.',
  'Riv over sitronskall.',
  'Server med godt brød, knekkebrød eller grønnsaker til å dyppe.'
], 280, 3, 24, 15);

WITH butter AS (SELECT id FROM recipes WHERE title = 'Smørbrett (Butter board)' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM butter), 'Smør (romtemperert)', '250', 'g', ARRAY['melk']),
  ((SELECT id FROM butter), 'Flaksalt', '1', 'ts', ARRAY[]::text[]),
  ((SELECT id FROM butter), 'Honning', '2', 'ss', ARRAY[]::text[]),
  ((SELECT id FROM butter), 'Ferske urter (rosmarin, timian)', '', '', ARRAY[]::text[]),
  ((SELECT id FROM butter), 'Soltørkede tomater', '50', 'g', ARRAY[]::text[]),
  ((SELECT id FROM butter), 'Oliven', '50', 'g', ARRAY[]::text[]),
  ((SELECT id FROM butter), 'Ristede nøtter', '50', 'g', ARRAY['nøtter']),
  ((SELECT id FROM butter), 'Sitron', '1', 'stk', ARRAY[]::text[]),
  ((SELECT id FROM butter), 'Brød til servering', '', '', ARRAY['gluten']);

-- Viral recipe 7: Crispy chilli oil eggs
INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES ('Sprøstekte egg med chiliolje', 'Virale TikTok-egg med sprø kanter og krydret chiliolje', 2, 5, 5, 'Frokost', 'breakfast', 'published', ARRAY['egg'], ARRAY['glutenfri','laktosefri'], ARRAY[
  'Varm opp rikelig olivenolje i en liten stekepanne på middels høy varme.',
  'Tilsett chiliflaak, hvitløk og en klype salt i oljen.',
  'Når oljen bobler, knekk eggene forsiktig oppi.',
  'Øs den varme oljen over eggehvitene med en skje.',
  'Stek til hvitene er sprø i kantene men plommen er flytende.',
  'Løft opp eggene med en hulskje.',
  'Server på toast eller ris med litt soyasaus.'
], 220, 14, 18, 1);

WITH chilli AS (SELECT id FROM recipes WHERE title = 'Sprøstekte egg med chiliolje' LIMIT 1)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens) VALUES
  ((SELECT id FROM chilli), 'Egg', '4', 'stk', ARRAY['egg']),
  ((SELECT id FROM chilli), 'Olivenolje', '4', 'ss', ARRAY[]::text[]),
  ((SELECT id FROM chilli), 'Chiliflaak', '1', 'ts', ARRAY[]::text[]),
  ((SELECT id FROM chilli), 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
  ((SELECT id FROM chilli), 'Salt', '1', 'klype', ARRAY[]::text[]);
