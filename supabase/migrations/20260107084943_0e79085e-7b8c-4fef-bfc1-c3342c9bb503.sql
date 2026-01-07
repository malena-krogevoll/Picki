-- Insert existing hardcoded recipes into the database
INSERT INTO public.recipes (id, title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Bakt laks med grønnsaker', 'Saftig laks med ovnsbakte rotgrønnsaker og friske urter', 4, 15, 25, 'Fisk', 'dinner', 'published', ARRAY['fisk']::text[], ARRAY['pescetarisk', 'glutenfri', 'laktosefri']::text[], ARRAY['Forvarm ovnen til 200°C.', 'Skjær gulrøttene i skiver og brokkoli i buketter.', 'Legg grønnsakene på et stekebrett, drypp over olivenolje, salt og pepper.', 'Legg laksfileten oppå grønnsakene.', 'Press sitron over laksen og krydre med salt, pepper og hakket dill.', 'Stek i ovnen i 20-25 minutter til laksen er gjennomstekt.', 'Server med sitronbåter på siden.']::text[]),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Hjemmelaget kjøttboller', 'Klassiske kjøttboller av rent kjøtt med kremet saus', 4, 20, 30, 'Kjøtt', 'dinner', 'published', ARRAY['gluten', 'melk', 'egg']::text[], ARRAY[]::text[], ARRAY['Bland kjøttdeig, egg, finhakket løk, havregryn, melk, salt og pepper.', 'Form deigen til kjøttboller.', 'Stek kjøttbollene i smør til de er gjennomstekte og gylne.', 'Ta kjøttbollene ut av pannen.', 'Bland mel i pannen og rør inn fløten for å lage saus.', 'La sausen koke opp og smak til med salt og pepper.', 'Legg kjøttbollene tilbake i sausen og la dem varmes.', 'Server med kokte poteter eller ris.']::text[]),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Grønnsakssuppe', 'Næringsrik og fyldig suppe med ferske grønnsaker', 6, 15, 30, 'Vegetar', 'dinner', 'published', ARRAY['selleri']::text[], ARRAY['vegetar', 'vegan', 'glutenfri', 'laktosefri']::text[], ARRAY['Skrell og hakk alle grønnsakene i terninger.', 'Varm opp oljen i en stor gryte.', 'Stek løk og purre til de er myke.', 'Tilsett resten av grønnsakene og stek i 5 minutter.', 'Hell over buljongen og la det koke i 20-25 minutter til grønnsakene er møre.', 'Smak til med salt og pepper.', 'Topp med fersk hakket persille før servering.']::text[]),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Kylling med ris og grønnsaker', 'Enkel og sunn middag med saftig kylling', 4, 10, 35, 'Kylling', 'dinner', 'published', ARRAY[]::text[], ARRAY['glutenfri', 'laktosefri']::text[], ARRAY['Kok risen etter anvisning på pakken.', 'Skjær kyllingen i terninger og krydre med salt og pepper.', 'Skjær paprika i strimler.', 'Stek kyllingen i olje til den er gjennomstekt.', 'Tilsett hakket hvitløk, paprika og sukkererter.', 'Stek videre i 5 minutter.', 'Bland inn den kokte risen og rør godt.', 'Server umiddelbart.']::text[]),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Pasta med tomatsaus', 'Klassisk tomatsaus med ferske urter', 4, 10, 25, 'Pasta', 'dinner', 'published', ARRAY['gluten', 'melk']::text[], ARRAY['vegetar']::text[], ARRAY['Kok pastaen etter anvisning på pakken.', 'Stek finhakket løk og hvitløk i olivenolje.', 'Tilsett hakkede tomater og la det småkoke i 15 minutter.', 'Smak til med salt, pepper og fersk basilikum.', 'Bland den varme pastaen med sausen.', 'Server med revet parmesan på toppen.']::text[]),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Biff med stekte grønnsaker', 'Mørt kjøtt med sprø, fargerike grønnsaker', 4, 15, 20, 'Kjøtt', 'dinner', 'published', ARRAY[]::text[], ARRAY['glutenfri', 'laktosefri', 'lavkarbo']::text[], ARRAY['Skjær grønnsakene i biter.', 'Krydre biffen med salt, pepper og hakket rosmarin.', 'Stek biffen i olje til ønsket stekegrad, la den hvile.', 'Stek grønnsakene med hvitløk til de er møre men sprø.', 'Skjær biffen i skiver.', 'Server biffen med de stekte grønnsakene.']::text[]);

-- Insert ingredients for Bakt laks med grønnsaker
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Laksfilet', '600', 'g', ARRAY['fisk']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Gulrøtter', '500', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Brokkoli', '400', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Olivenolje', '2', 'ss', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Salt', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Pepper', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Sitron', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Fersk dill', '', '', ARRAY[]::text[]);

-- Insert ingredients for Hjemmelaget kjøttboller
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Kjøttdeig', '500', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Egg', '1', 'stk', ARRAY['egg']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Løk', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Havregryn', '2', 'ss', ARRAY['gluten']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Melk', '1', 'dl', ARRAY['melk']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Salt', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Pepper', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Smør', '2', 'ss', ARRAY['melk']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Fløte', '3', 'dl', ARRAY['melk']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Mel', '2', 'ss', ARRAY['gluten']::text[]);

-- Insert ingredients for Grønnsakssuppe
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Gulrøtter', '3', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Løk', '2', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Poteter', '3', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Purre', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Stangselleri', '2', 'stilker', ARRAY['selleri']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Grønnsaksbuljong', '1.5', 'liter', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Olivenolje', '2', 'ss', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Salt', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Pepper', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Fersk persille', '', '', ARRAY[]::text[]);

-- Insert ingredients for Kylling med ris og grønnsaker
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Kyllingfilét', '600', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Ris', '3', 'dl', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Rød paprika', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Gul paprika', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Sukkererter', '200', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Olivenolje', '2', 'ss', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Salt', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Pepper', '', '', ARRAY[]::text[]);

-- Insert ingredients for Pasta med tomatsaus
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Pasta', '400', 'g', ARRAY['gluten']::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Tomater', '800', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Løk', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Olivenolje', '3', 'ss', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Salt', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Pepper', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Fersk basilikum', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Parmesan', '', '', ARRAY['melk']::text[]);

-- Insert ingredients for Biff med stekte grønnsaker
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit, allergens)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Biff', '600', 'g', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Squash', '2', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Aubergine', '1', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Paprika', '2', 'stk', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Olivenolje', '3', 'ss', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Hvitløk', '2', 'fedd', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Salt', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Pepper', '', '', ARRAY[]::text[]),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Fersk rosmarin', '', '', ARRAY[]::text[]);

-- Add some DIY recipes
INSERT INTO public.recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps, replaces)
VALUES
  ('Hjemmelaget ketchup', 'Naturlig ketchup uten tilsetningsstoffer - mye bedre enn butikkvarianten', 20, 10, 30, 'Sauser', 'diy', 'published', ARRAY[]::text[], ARRAY['vegan', 'glutenfri', 'laktosefri']::text[], ARRAY['Bland tomatpuré, eplecidereddik, honning, salt, hvitløkspulver og løkpulver i en gryte.', 'La det småkoke på lav varme i 20-30 minutter til det tykner.', 'Smak til med mer honning eller eddik etter ønske.', 'Avkjøl og oppbevar i glass i kjøleskapet.', 'Holder seg i 2-3 uker.']::text[], 'Ferdig ketchup'),
  
  ('Hjemmelaget majones', 'Kremet majones med bare rene ingredienser', 15, 10, 0, 'Sauser', 'diy', 'published', ARRAY['egg', 'sennep']::text[], ARRAY['glutenfri', 'laktosefri']::text[], ARRAY['Ha eggeplomme, sennep, sitronsaft, salt og pepper i en bolle.', 'Visp sammen til det er jevnt.', 'Tilsett olje dråpevis mens du visper kontinuerlig.', 'Fortsett til all oljen er tilsatt og majonesen er tykk og kremet.', 'Smak til og oppbevar i kjøleskapet i opptil 1 uke.']::text[], 'Ferdig majones'),
  
  ('Hjemmelaget pizzabunn', 'Enkel pizzadeig med få ingredienser', 2, 15, 0, 'Bakst', 'diy', 'published', ARRAY['gluten']::text[], ARRAY['vegetar', 'vegan', 'laktosefri']::text[], ARRAY['Bland mel, gjær, salt og vann i en bolle.', 'Elt deigen i 10 minutter til den er smidig.', 'La den heve i 1 time til den har doblet seg.', 'Del deigen i to og kjevle ut til pizzabunner.', 'Toppes etter ønske og stekes på 250°C i 10-12 minutter.']::text[], 'Ferdig pizzabunn');

-- Add some base recipes
INSERT INTO public.recipes (title, description, servings, prep_time, cook_time, category, recipe_type, status, allergens, diet_tags, steps)
VALUES
  ('Hjemmelaget grønnsaksbuljong', 'Smakfull buljong som kan brukes i supper og sauser', 20, 15, 60, 'Grunnoppskrifter', 'base', 'published', ARRAY['selleri']::text[], ARRAY['vegan', 'glutenfri', 'laktosefri']::text[], ARRAY['Skjær alle grønnsakene i grove biter.', 'Ha grønnsakene i en stor gryte med vann.', 'Tilsett laurbærblad, timian og pepperkorn.', 'La det småkoke i 45-60 minutter.', 'Sil buljongen og oppbevar i glass eller frys ned.', 'Holder seg 1 uke i kjøleskap eller 3 måneder i fryser.']::text[]),
  
  ('Klassisk pesto', 'Frisk basilikumpesto perfekt til pasta og smørbrød', 8, 10, 0, 'Sauser', 'base', 'published', ARRAY['nøtter', 'melk']::text[], ARRAY['vegetar', 'glutenfri']::text[], ARRAY['Ha basilikum, hvitløk og pinjekjerner i en foodprosessor.', 'Kjør til det er finhakket.', 'Tilsett revet parmesan og kjør igjen.', 'Ha i olivenolje i en tynn stråle mens maskinen går.', 'Smak til med salt og pepper.', 'Oppbevar i glass med et lag olje på toppen i kjøleskapet.']::text[]);