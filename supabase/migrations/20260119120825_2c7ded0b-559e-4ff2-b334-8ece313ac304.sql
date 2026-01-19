-- Insert DIY recipes

-- 1. Sprø proteinchips
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Sprø proteinchips',
  'Enkle og sprø proteinchips med kun 110 kcal. Perfekt som snacks uten dårlig samvittighet.',
  'Snacks',
  'diy',
  'published',
  5,
  12,
  2,
  ARRAY[
    'Visp eggehviten luftig i en bolle.',
    'Klatt ut på muffinsformer eller rett på stekebrett med bakepapir.',
    'Topp med revet ost og krydder etter smak.',
    'Stek på 190°C i ca. 12 minutter til de er sprø og gylne.'
  ],
  ARRAY['egg', 'melk'],
  ARRAY['glutenfri', 'lavkarbo', 'høyprotein'],
  'Vanlige chips og proteinsnacks'
);

-- 2. Sunt sjokoladepålegg
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Sunt sjokoladepålegg',
  'Kremet sjokoladepålegg laget av kikerter. Overraskende godt og mye sunnere enn Nutella.',
  'Pålegg',
  'diy',
  'published',
  10,
  0,
  10,
  ARRAY[
    'Skyll kikertene godt under rennende vann.',
    'Ha alle ingrediensene i en blender.',
    'Miks til du får en glatt og kremet konsistens.',
    'Tilsett litt lake eller melk om pålegget blir for tykt.',
    'Smak til med salt, og juster sødme eller kakaosmak etter ønske.',
    'Oppbevar i tett beholder i kjøleskapet i opptil 5 dager.'
  ],
  ARRAY['nøtter'],
  ARRAY['vegansk', 'meierifri'],
  'Nutella og andre sjokoladepålegg'
);

-- 3. Sjokolade-kikerter
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Sjokolade-kikerter',
  'Sprø kikerter dekket med sjokolade og havsalt. Sunnere alternativ til Smash!',
  'Snacks',
  'diy',
  'published',
  15,
  25,
  4,
  ARRAY[
    'Skyll kikertene godt og tørk dem grundig med kjøkkenpapir.',
    'Rist kikertene på 200°C varmluft til de er helt sprø (ca. 20-25 min).',
    'Smelt sjokoladen i vannbad.',
    'Ha de sprø kikertene i en form og hell over den smeltede sjokoladen.',
    'Rør godt så alle kikertene blir dekket.',
    'Dryss over havsalt.',
    'Sett i kjøleskapet til sjokoladen har stivnet helt.'
  ],
  ARRAY['melk'],
  ARRAY['vegetarisk', 'glutenfri'],
  'Smash og lignende sjokoladesnacks'
);

-- 4. Hjemmelagde gummibjørner
INSERT INTO recipes (title, description, category, recipe_type, status, prep_time, cook_time, servings, steps, allergens, diet_tags, replaces)
VALUES (
  'Hjemmelagde gummibjørner',
  'Naturlige gummibjørner med ekte frukt. Ingen kunstige tilsetningsstoffer!',
  'Snacks',
  'diy',
  'published',
  15,
  0,
  6,
  ARRAY[
    'Bland eplejuice, sitronsaft, honning og gelatinpulver i en kjele.',
    'Varm opp på middels varme mens du rører jevnlig.',
    'Pass på at det ikke koker, men at honning og gelatin løser seg helt opp.',
    'Hell halvparten av blandingen i små silikonformer.',
    'Varm bringebærene i resten av blandingen.',
    'Sil bringebærblandingen og hell over i formene.',
    'Sett i kjøleskapet til det er helt stivnet (minst 2 timer).',
    'Oppbevar i kjøleskapet.'
  ],
  ARRAY[]::text[],
  ARRAY['glutenfri', 'meierifri'],
  'Kjøpte gummibjørner og vingummi'
);

-- Now insert ingredients for each recipe
-- We need to get the recipe IDs first, so we use a CTE approach

-- Ingredients for Sprø proteinchips
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Eggehvite', '150', 'g', ARRAY['egg']
FROM recipes WHERE title = 'Sprø proteinchips' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Mager ost', '20', 'g', ARRAY['melk']
FROM recipes WHERE title = 'Sprø proteinchips' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Valgfrie krydder', NULL, NULL, ARRAY[]::text[], true
FROM recipes WHERE title = 'Sprø proteinchips' AND recipe_type = 'diy';

-- Ingredients for Sunt sjokoladepålegg
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kikerter (avrent)', '1', 'boks', ARRAY[]::text[]
FROM recipes WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kakaopulver', '1', 'dl', ARRAY[]::text[]
FROM recipes WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Lønnesirup', '1', 'dl', ARRAY[]::text[]
FROM recipes WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hasselnøttsmør', '1-2', 'ss', ARRAY['nøtter']
FROM recipes WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Kikertlake eller melk', '2', 'ts', ARRAY[]::text[], true
FROM recipes WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Salt', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Sunt sjokoladepålegg' AND recipe_type = 'diy';

-- Ingredients for Sjokolade-kikerter
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kikerter', '1', 'boks', ARRAY[]::text[]
FROM recipes WHERE title = 'Sjokolade-kikerter' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Mørk sjokolade', '150-200', 'g', ARRAY['melk']
FROM recipes WHERE title = 'Sjokolade-kikerter' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Havsalt', NULL, NULL, ARRAY[]::text[]
FROM recipes WHERE title = 'Sjokolade-kikerter' AND recipe_type = 'diy';

-- Ingredients for Hjemmelagde gummibjørner
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Eplejuice', '4', 'dl', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelagde gummibjørner' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron (presset)', '1', 'stk', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelagde gummibjørner' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Honning', '1-2', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelagde gummibjørner' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Gelatinpulver', '5', 'ss', ARRAY[]::text[]
FROM recipes WHERE title = 'Hjemmelagde gummibjørner' AND recipe_type = 'diy';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens, is_optional)
SELECT id, 'Bringebær', NULL, NULL, ARRAY[]::text[], true
FROM recipes WHERE title = 'Hjemmelagde gummibjørner' AND recipe_type = 'diy';