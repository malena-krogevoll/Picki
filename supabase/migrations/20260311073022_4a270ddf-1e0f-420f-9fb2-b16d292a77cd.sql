-- Kolonihagen Kokt skinke: Svinekjøtt, vann, salt = NOVA 1 (minimally processed)
UPDATE public.products 
SET nova_class = 1, nova_confidence = 0.95, nova_reason = 'Simple ingredients: meat, water, salt. Minimally processed.',
    ingredients_hash = md5('Svinekjøtt*, vann, salt. *Økologisk')
WHERE ean = '7032069726570';

-- Kolonihagen Pepperskinke: Svinekjøtt, vann, salt, pepper = NOVA 1
UPDATE public.products 
SET nova_class = 1, nova_confidence = 0.95, nova_reason = 'Simple ingredients: meat, water, salt, pepper. Minimally processed.',
    ingredients_hash = md5('Svinekjøtt*, vann, salt, pepper*. *Økologisk')
WHERE ean = '7032069738856';