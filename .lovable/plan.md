

## Utforsk renvarer

En ny seksjon der brukere kan bla gjennom, søke og oppdage renvare-produkter (NOVA 1-2) kategorisert etter type, med butikktilgjengelighet tydelig vist.

### Ny side: `/explore`

**Rute**: `src/pages/Explore.tsx`

Hovedstruktur:
1. **Søkefelt** øverst for fri-tekst filtrering
2. **Butikkfilter** (valgfritt) -- dropdown/chips med butikkjeder fra `StoreSelectorDialog`-listen
3. **Kategorivisning** -- grid med kategorikort som barnemat, ferdigmat, pålegg, meieri, frukt og grønt etc.
4. **Produktliste** -- når en kategori er valgt, vises produkter med bilde, navn, merke, NOVA-badge, og butikkjede-badges

### Datahenting

Ny edge function `browse-clean-products`:
- Henter fra `products`-tabellen filtrert på `nova_class <= 2`
- Joiner med `offers` + `chains` for butikktilgjengelighet
- Støtter kategori-filter (basert på nøkkelord-matching fra `storeLayoutSort.ts`-logikken) og butikk-filter
- Støtter søketekst-filter
- Paginering (20 produkter per side)

### Produktkort i listen

Hvert kort viser:
- Produktbilde (fra `products.image_url`)
- Merke + produktnavn
- NOVA-badge (1 eller 2)
- Butikkjede-ikoner/badges (fra `offers` → `chains`)
- Favoritt-hjerte (gjenbruker `useFavoriteProducts`)
- "Legg til i handleliste"-knapp

### Handleliste-integrasjon

Når brukeren trykker "Legg til", vises en enkel dialog:
- Velg hvilken aktiv handleliste (eller opprett ny)
- Varen legges til med produktnavn som `name`

Gjenbruker `useShoppingList.addItem()`.

### Kategorier

Definert som en statisk liste med emoji + norsk navn, bruker utvidede nøkkelord for å matche produkter:
- 🍎 Frukt og grønt
- 🥛 Meieri
- 🧀 Pålegg
- 🥩 Kjøtt og ferskvare
- 🐟 Fisk og sjømat
- 🍼 Barnemat
- 🍽️ Ferdigmat
- 🥫 Hermetikk
- 🍝 Pasta, ris og korn
- 🧂 Sauser og krydder
- 🥤 Drikkevarer

### Navigasjon

- Ny knapp på Dashboard i grid-en ved siden av "Min kokebok" og "Oppskrifter"
- Ikon: `Leaf` (renvare-konsept)
- Tekst: "Utforsk renvarer"

### Endringer per fil

| Fil | Endring |
|-----|---------|
| `supabase/functions/browse-clean-products/index.ts` | Ny edge function: henter NOVA ≤ 2 produkter med butikk-join, kategori/butikk/søk-filter, paginering |
| `src/pages/Explore.tsx` | Ny side med kategorivisning, søk, butikkfilter, produktliste med favoritt + legg-til-liste |
| `src/App.tsx` | Ny rute `/explore` |
| `src/pages/Dashboard.tsx` | Ny knapp i grid: "Utforsk renvarer" → `/explore` |

### Tekniske detaljer

**Edge function SQL-logikk:**
```sql
SELECT p.ean, p.name, p.brand, p.image_url, p.nova_class,
       array_agg(DISTINCT c.name) as chains
FROM products p
JOIN offers o ON o.ean = p.ean
JOIN chains c ON c.id = o.chain_id
WHERE p.nova_class <= 2
  AND p.name IS NOT NULL
  -- optional: AND c.name = $storeFilter
  -- optional: AND p.name ILIKE '%search%'
GROUP BY p.ean, p.name, p.brand, p.image_url, p.nova_class
ORDER BY p.nova_class ASC, p.name ASC
LIMIT 20 OFFSET $offset
```

**Legg-til-liste dialog:** Enkel `AlertDialog` med liste over aktive handlelister + "Ny liste"-knapp. Bruker `useShoppingList` for å legge til varen.

**Favoritt:** Gjenbruker `useFavoriteProducts.toggleFavorite()` direkte på hvert produktkort.

