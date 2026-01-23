
-- Insert ingredients for the new recipes

-- Recipe: Stekt torsk med sitronsmør
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Torskefilet', '400', 'g', ARRAY['fisk'] FROM recipes WHERE title = 'Stekt torsk med sitronsmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Smør', '50', 'g', ARRAY['melk'] FROM recipes WHERE title = 'Stekt torsk med sitronsmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt torsk med sitronsmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk persille', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt torsk med sitronsmør';

-- Recipe: Kyllingwok med cashewnøtter
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kyllingfilet', '500', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Cashewnøtter', '100', 'g', ARRAY['nøtter'] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Paprika', '2', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sukkererter', '150', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Brokkoli', '200', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sesamolje', '2', 'ss', ARRAY['sesam'] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Soyasaus', '3', 'ss', ARRAY['soya'] FROM recipes WHERE title = 'Kyllingwok med cashewnøtter';

-- Recipe: Egg og avokado på toast
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Egg', '4', 'stk', ARRAY['egg'] FROM recipes WHERE title = 'Egg og avokado på toast';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Avokado', '2', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Egg og avokado på toast';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Grovt brød', '4', 'skiver', ARRAY['gluten'] FROM recipes WHERE title = 'Egg og avokado på toast';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Lime', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Egg og avokado på toast';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Smør', '1', 'ss', ARRAY['melk'] FROM recipes WHERE title = 'Egg og avokado på toast';

-- Recipe: Lakseburgere med urter
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk laks', '500', 'g', ARRAY['fisk'] FROM recipes WHERE title = 'Lakseburgere med urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Egg', '1', 'stk', ARRAY['egg'] FROM recipes WHERE title = 'Lakseburgere med urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk dill', '3', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Lakseburgere med urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Gressløk', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Lakseburgere med urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Burgerbrød', '4', 'stk', ARRAY['gluten'] FROM recipes WHERE title = 'Lakseburgere med urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Tzatziki', '1', 'dl', ARRAY['melk'] FROM recipes WHERE title = 'Lakseburgere med urter';

-- Recipe: Rask tomatsuppe med basilikum
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hermetiske tomater', '800', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Rask tomatsuppe med basilikum';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Rask tomatsuppe med basilikum';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '2', 'fedd', ARRAY[]::text[] FROM recipes WHERE title = 'Rask tomatsuppe med basilikum';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Grønnsaksbuljong', '5', 'dl', ARRAY[]::text[] FROM recipes WHERE title = 'Rask tomatsuppe med basilikum';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fløte', '1', 'dl', ARRAY['melk'] FROM recipes WHERE title = 'Rask tomatsuppe med basilikum';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk basilikum', '1', 'bunt', ARRAY[]::text[] FROM recipes WHERE title = 'Rask tomatsuppe med basilikum';

-- Recipe: Stekt kyllingbryst med honning og sennep
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kyllingbryst', '4', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt kyllingbryst med honning og sennep';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Honning', '3', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt kyllingbryst med honning og sennep';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Grov sennep', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt kyllingbryst med honning og sennep';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt kyllingbryst med honning og sennep';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt kyllingbryst med honning og sennep';

-- Recipe: Reker i hvitløksmør
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Reker', '500', 'g', ARRAY['skalldyr'] FROM recipes WHERE title = 'Reker i hvitløksmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Smør', '75', 'g', ARRAY['melk'] FROM recipes WHERE title = 'Reker i hvitløksmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '4', 'fedd', ARRAY[]::text[] FROM recipes WHERE title = 'Reker i hvitløksmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Reker i hvitløksmør';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk persille', '3', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Reker i hvitløksmør';

-- Recipe: Omelett med ost og urter
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Egg', '6', 'stk', ARRAY['egg'] FROM recipes WHERE title = 'Omelett med ost og urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Ost', '100', 'g', ARRAY['melk'] FROM recipes WHERE title = 'Omelett med ost og urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Melk', '2', 'ss', ARRAY['melk'] FROM recipes WHERE title = 'Omelett med ost og urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Gressløk', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Omelett med ost og urter';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Smør', '1', 'ss', ARRAY['melk'] FROM recipes WHERE title = 'Omelett med ost og urter';

-- Recipe: Bakte søtpoteter med svart bønner
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Søtpoteter', '4', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Bakte søtpoteter med svart bønner';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Svarte bønner', '400', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Bakte søtpoteter med svart bønner';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Avokado', '2', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Bakte søtpoteter med svart bønner';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Spisskummen', '1', 'ts', ARRAY[]::text[] FROM recipes WHERE title = 'Bakte søtpoteter med svart bønner';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Lime', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Bakte søtpoteter med svart bønner';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk koriander', '1', 'bunt', ARRAY[]::text[] FROM recipes WHERE title = 'Bakte søtpoteter med svart bønner';

-- Recipe: Stekt ørret med mandler
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Ørretfilet', '4', 'stk', ARRAY['fisk'] FROM recipes WHERE title = 'Stekt ørret med mandler';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvetemel', '3', 'ss', ARRAY['gluten'] FROM recipes WHERE title = 'Stekt ørret med mandler';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Smør', '75', 'g', ARRAY['melk'] FROM recipes WHERE title = 'Stekt ørret med mandler';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Mandelflak', '50', 'g', ARRAY['nøtter'] FROM recipes WHERE title = 'Stekt ørret med mandler';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk persille', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt ørret med mandler';

-- Recipe: Enkel kylling curry
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kyllingfilet', '500', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Enkel kylling curry';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kokosmelk', '400', 'ml', ARRAY[]::text[] FROM recipes WHERE title = 'Enkel kylling curry';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Enkel kylling curry';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '3', 'fedd', ARRAY[]::text[] FROM recipes WHERE title = 'Enkel kylling curry';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Currypulver', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Enkel kylling curry';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk koriander', '1', 'bunt', ARRAY[]::text[] FROM recipes WHERE title = 'Enkel kylling curry';

-- Recipe: Hvitløksstekt kyllinglår
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kyllinglår', '8', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Hvitløksstekt kyllinglår';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '1', 'hel', ARRAY[]::text[] FROM recipes WHERE title = 'Hvitløksstekt kyllinglår';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Paprikapulver', '1', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Hvitløksstekt kyllinglår';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Hvitløksstekt kyllinglår';

-- Recipe: Pasta med brokkoli og sitron
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Pasta', '400', 'g', ARRAY['gluten'] FROM recipes WHERE title = 'Pasta med brokkoli og sitron';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Brokkoli', '400', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Pasta med brokkoli og sitron';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Hvitløk', '3', 'fedd', ARRAY[]::text[] FROM recipes WHERE title = 'Pasta med brokkoli og sitron';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Pasta med brokkoli og sitron';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Parmesan', '50', 'g', ARRAY['melk'] FROM recipes WHERE title = 'Pasta med brokkoli og sitron';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '4', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Pasta med brokkoli og sitron';

-- Recipe: Biffstrimlinger med paprika
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Biff', '500', 'g', ARRAY[]::text[] FROM recipes WHERE title = 'Biffstrimlinger med paprika';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Paprika', '3', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Biffstrimlinger med paprika';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Løk', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Biffstrimlinger med paprika';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Soyasaus', '2', 'ss', ARRAY['soya'] FROM recipes WHERE title = 'Biffstrimlinger med paprika';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Olivenolje', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Biffstrimlinger med paprika';

-- Recipe: Stekt sei med kapers
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Seifilet', '4', 'stk', ARRAY['fisk'] FROM recipes WHERE title = 'Stekt sei med kapers';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Smør', '50', 'g', ARRAY['melk'] FROM recipes WHERE title = 'Stekt sei med kapers';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Kapers', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt sei med kapers';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Sitron', '1', 'stk', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt sei med kapers';
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, allergens)
SELECT id, 'Fersk persille', '2', 'ss', ARRAY[]::text[] FROM recipes WHERE title = 'Stekt sei med kapers';
