
-- Insert new quick and easy dinner recipes with whole foods
INSERT INTO recipes (title, description, category, recipe_type, status, servings, prep_time, cook_time, steps, allergens, diet_tags, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving)
VALUES
-- 1. Stekt torsk med sitronsmør
('Stekt torsk med sitronsmør', 'Saftig torsk med smeltende sitronsmør og dampede grønnsaker', 'Fisk', 'dinner', 'published', 4, 10, 15, 
ARRAY['Krydre torskefiletene med salt og pepper.', 'Varm opp en stekepanne med litt olje på medium-høy varme.', 'Stek torsken 3-4 minutter på hver side til gyllen og gjennomstekt.', 'Smelt smør i en liten kjele, tilsett sitronsaft og hakket persille.', 'Server torsken med sitronsmøret over og dampede grønnsaker ved siden.'],
ARRAY['fisk', 'melk'], ARRAY['Pescatarianer', 'Glutenfri'], 280, 32, 14, 4),

-- 2. Kyllingwok med cashewnøtter
('Kyllingwok med cashewnøtter', 'Rask og smakfull wok med sprø grønnsaker og nøtter', 'Kylling', 'dinner', 'published', 4, 15, 10,
ARRAY['Skjær kyllingen i biter og krydre med salt og pepper.', 'Varm opp en wok eller stor stekepanne på høy varme med sesamolje.', 'Stek kyllingen i 4-5 minutter til gjennomstekt, ta ut av pannen.', 'Wok grønnsakene (paprika, sukkererter, brokkoli) i 2-3 minutter.', 'Tilsett kyllingen tilbake sammen med soyasaus og cashewnøtter.', 'Rør godt og server umiddelbart.'],
ARRAY['soya', 'nøtter', 'sesam'], ARRAY['Glutenfri'], 380, 35, 18, 22),

-- 3. Egg og avokado på toast
('Egg og avokado på toast', 'Enkel og næringsrik måltid med perfekt stekt egg', 'Egg', 'dinner', 'published', 2, 5, 8,
ARRAY['Rist brødskivene til de er gylne.', 'Mos avokadoen med en gaffel, tilsett lime, salt og pepper.', 'Stek eggene i smør til ønsket konsistens.', 'Fordel avokadomosen på brødskivene.', 'Legg stekt egg på toppen, dryss over chiliflak om ønsket.'],
ARRAY['egg', 'gluten'], ARRAY['Vegetarianer'], 320, 14, 22, 24),

-- 4. Lakseburgere med urter
('Lakseburgere med urter', 'Hjemmelagde burgere av fersk laks med friske urter', 'Fisk', 'dinner', 'published', 4, 15, 10,
ARRAY['Hakk laksen grovt med kniv eller i en hurtigmikser.', 'Bland inn egg, hakket dill, gressløk, salt og pepper.', 'Form til 4 burgere.', 'Stek i smør på medium varme, 3-4 minutter på hver side.', 'Server i grove burgerbrød med salat, tomat og tzatziki.'],
ARRAY['fisk', 'egg', 'gluten', 'melk'], ARRAY['Pescatarianer'], 340, 28, 16, 22),

-- 5. Rask tomatsuppe med basilikum
('Rask tomatsuppe med basilikum', 'Kremet tomatsuppe laget på hermetiske tomater', 'Suppe', 'dinner', 'published', 4, 5, 20,
ARRAY['Fres løk og hvitløk i olivenolje til myke.', 'Tilsett hermetiske tomater og grønnsaksbuljong.', 'Kok i 15 minutter.', 'Blend suppen til glatt konsistens.', 'Rør inn en skvett fløte og fersk basilikum.', 'Smak til med salt og pepper, server med godt brød.'],
ARRAY['melk']::text[], ARRAY['Vegetarianer', 'Glutenfri'], 180, 4, 10, 18),

-- 6. Stekt kyllingbryst med honning og sennep
('Stekt kyllingbryst med honning og sennep', 'Saftig kylling med søt og syrlig glasur', 'Kylling', 'dinner', 'published', 4, 10, 20,
ARRAY['Bank ut kyllingbrystene til jevn tykkelse.', 'Krydre med salt og pepper.', 'Bland honning, sennep og litt sitronsaft.', 'Stek kyllingen i olje på medium varme, 5-6 minutter på hver side.', 'Pensle med honning-sennep glasuren de siste minuttene.', 'Server med kokte grønnsaker eller salat.'],
ARRAY[]::text[], ARRAY['Glutenfri'], 290, 34, 8, 14),

-- 7. Reker i hvitløksmør
('Reker i hvitløksmør', 'Saftige reker i smeltende hvitløksmør med persille', 'Skalldyr', 'dinner', 'published', 4, 5, 8,
ARRAY['Smelt smør i en stekepanne på medium varme.', 'Tilsett finhakket hvitløk og stek i 30 sekunder.', 'Legg i rekene og stek i 2-3 minutter til de er rosa og gjennomstekte.', 'Tilsett sitronsaft og hakket persille.', 'Smak til med salt og pepper.', 'Server med godt brød til å dyppe.'],
ARRAY['skalldyr', 'melk'], ARRAY['Pescatarianer', 'Glutenfri'], 220, 24, 12, 2),

-- 8. Omelett med ost og urter
('Omelett med ost og urter', 'Luftig omelett fylt med smeltet ost og friske urter', 'Egg', 'dinner', 'published', 2, 5, 8,
ARRAY['Visp sammen egg, en skvett melk, salt og pepper.', 'Smelt smør i en stekepanne på medium varme.', 'Hell i eggeblandingen og la den stivne på bunnen.', 'Strø over revet ost og hakkede urter (gressløk, persille).', 'Brett omeletten og la osten smelte.', 'Server umiddelbart med en frisk salat.'],
ARRAY['egg', 'melk'], ARRAY['Vegetarianer', 'Glutenfri'], 280, 18, 22, 2),

-- 9. Bakte søtpoteter med svart bønner
('Bakte søtpoteter med svart bønner', 'Metende og næringsrik vegetarrett', 'Vegetar', 'dinner', 'published', 4, 10, 25,
ARRAY['Del søtpotetene i to og legg på et stekebrett.', 'Pensle med olivenolje, salt og pepper.', 'Bak på 220°C i 25 minutter til møre.', 'Varm opp svarte bønner med spisskummen, hvitløk og lime.', 'Fyll søtpotetene med bønneblandingen.', 'Topp med avokado, rømme og koriander.'],
ARRAY[]::text[], ARRAY['Vegetarianer', 'Veganer', 'Glutenfri'], 320, 12, 10, 48),

-- 10. Stekt ørret med mandler
('Stekt ørret med mandler', 'Klassisk ørret med brunt smør og sprø mandler', 'Fisk', 'dinner', 'published', 4, 10, 12,
ARRAY['Krydre ørretfiletene med salt og pepper.', 'Vend i mel og rist av overflødig mel.', 'Stek i smør på medium-høy varme, 3-4 minutter på hver side.', 'Ta fisken ut og tilsett mer smør til pannen.', 'La smøret brune lett, tilsett mandelflak og persille.', 'Hell det brune smøret over fisken og server.'],
ARRAY['fisk', 'nøtter', 'melk', 'gluten'], ARRAY['Pescatarianer'], 340, 32, 20, 8),

-- 11. Enkel kylling curry
('Enkel kylling curry', 'Kremet og mild curry med saftig kylling', 'Kylling', 'dinner', 'published', 4, 10, 20,
ARRAY['Skjær kyllingen i biter og krydre med salt.', 'Brun kyllingen i olje i en gryte, ta ut.', 'Fres løk og hvitløk til myke.', 'Tilsett currypulver og rør i 1 minutt.', 'Hell i kokosmelk og la det småkoke i 10 minutter.', 'Legg kyllingen tilbake og la det koke til gjennomstekt.', 'Server med ris og frisk koriander.'],
ARRAY[]::text[], ARRAY['Glutenfri'], 380, 32, 22, 12),

-- 12. Hvitløksstekt kyllinglår
('Hvitløksstekt kyllinglår', 'Saftige kyllinglår med sprø skinn og hvitløk', 'Kylling', 'dinner', 'published', 4, 10, 25,
ARRAY['Krydre kyllinglårene godt med salt, pepper og paprika.', 'Legg i en kald stekepanne med skinnet ned.', 'Sett på medium varme og stek i 15 minutter til sprø.', 'Snu og stek 10 minutter til, tilsett hvitløkfedd.', 'La hvitløken bli gyllen og myk.', 'Server med stekte poteter og grønnsaker.'],
ARRAY[]::text[], ARRAY['Glutenfri'], 320, 28, 20, 2),

-- 13. Pasta med brokkoli og sitron
('Pasta med brokkoli og sitron', 'Lett og frisk pasta med sprø brokkoli', 'Pasta', 'dinner', 'published', 4, 5, 15,
ARRAY['Kok pastaen etter anvisning, tilsett brokkoli de siste 3 minuttene.', 'Spar litt kokevannet.', 'Stek hvitløk i olivenolje i en stekepanne.', 'Tilsett kokt pasta, brokkoli og litt kokevann.', 'Bland inn sitronsaft, revet sitronskall og parmesan.', 'Krydre med salt, pepper og chiliflak.'],
ARRAY['gluten', 'melk'], ARRAY['Vegetarianer'], 360, 14, 12, 52),

-- 14. Biffstrimlinger med paprika
('Biffstrimlinger med paprika', 'Møre biffstrimler i fargerik paprikamiks', 'Kjøtt', 'dinner', 'published', 4, 10, 12,
ARRAY['Skjær biffen i tynne strimler.', 'Krydre med salt, pepper og litt paprikapulver.', 'Stek biffen på høy varme i 2-3 minutter, ta ut.', 'Wok paprikastrimler og løk i 3-4 minutter.', 'Tilsett biffen tilbake med litt soyasaus.', 'Server med ris eller brød.'],
ARRAY['soya']::text[], ARRAY['Glutenfri'], 340, 32, 16, 12),

-- 15. Stekt sei med kapers
('Stekt sei med kapers', 'Hverdagsfisk med smør, kapers og sitron', 'Fisk', 'dinner', 'published', 4, 5, 12,
ARRAY['Krydre seifiletene med salt og pepper.', 'Stek i smør på medium-høy varme, 3-4 minutter på hver side.', 'Ta fisken ut av pannen.', 'Tilsett mer smør, kapers og sitronsaft til pannen.', 'La smøret brune lett og hell over fisken.', 'Strø over hakket persille og server.'],
ARRAY['fisk', 'melk'], ARRAY['Pescatarianer', 'Glutenfri'], 240, 30, 12, 2);
