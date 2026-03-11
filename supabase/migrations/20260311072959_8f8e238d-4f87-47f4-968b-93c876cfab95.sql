-- Add known ingredients for Kolonihagen Kokt skinke (from product label / EPD catalog)
UPDATE public.products 
SET ingredients_raw = 'Svinekjøtt*, vann, salt. *Økologisk'
WHERE ean = '7032069726570';

-- Also update product_sources
UPDATE public.product_sources
SET ingredients_raw = 'Svinekjøtt*, vann, salt. *Økologisk'
WHERE ean = '7032069726570' AND source = 'MANUAL';

-- Add known ingredients for Kolonihagen Pepperskinke
UPDATE public.products 
SET ingredients_raw = 'Svinekjøtt*, vann, salt, pepper*. *Økologisk'
WHERE ean = '7032069738856';

UPDATE public.product_sources
SET ingredients_raw = 'Svinekjøtt*, vann, salt, pepper*. *Økologisk'
WHERE ean = '7032069738856' AND source = 'MANUAL';