-- Oppdater oppskrifter til frokost/lunsj-kategori
UPDATE recipes SET recipe_type = 'breakfast', category = 'Frokost' WHERE id IN (
  '51c31109-5f88-426d-aba6-e4f4ed69ee40', -- Havregrøt med banan og kanel
  '62d23d01-b8c5-4d18-b7eb-2c1c3cab255f', -- Omelett med grønnsaker
  '49c17300-a484-4181-bfcd-dc168898ceca', -- Omelett med grønnsaker (Egg)
  '0764f730-f2ef-429a-91ff-bcf68d63bde6', -- Omelett med urter og grønnsaker
  '3f2b0104-b92c-44b7-829d-7ca40e95e54f', -- Stekt egg med avokado og tomat
  '25e294a3-f5f3-4f83-b8f1-808763e07129', -- Stekt egg med avokado-toast
  '4dcbec84-2c2c-4fdb-b345-5b269fdc4532'  -- Bakt søtpotet med cottage cheese
);