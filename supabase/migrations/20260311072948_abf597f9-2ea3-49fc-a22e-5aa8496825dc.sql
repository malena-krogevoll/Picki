-- Expand Kolonihagen offers to all chains (not just Rema 1000)
INSERT INTO public.offers (ean, chain_id, last_seen_at, source)
SELECT p.ean, c.id, NOW(), 'UNIVERSAL'
FROM public.products p
CROSS JOIN public.chains c
WHERE p.brand = 'Kolonihagen'
  AND c.id != '199d092a-0c02-452a-996a-f42771975203'
ON CONFLICT (ean, chain_id) DO NOTHING;