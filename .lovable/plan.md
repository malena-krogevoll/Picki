

# Seede Kolonihagen-produkter direkte fra produktkatalogen

## Funn
PDF-katalogen inneholder ~70-80 produkter med produktnavn og EAN-numre (7032069..., 7090029..., 7040512..., 2374...-serier). Disse er Rema 1000-eksklusive og finnes ikke i Kassalapp.

## Plan

### 1. Ny edge function: `seed-kolonihagen`

Opprett `supabase/functions/seed-kolonihagen/index.ts` som:
- Har en hardkodet liste over alle Kolonihagen-produkter (navn, EAN, kategori, vekt) parsed fra PDF-katalogen
- Upsert-er hvert produkt inn i `product_sources` med `source = 'MANUAL'`
- Oppretter/oppdaterer `products`-tabellen via upsert
- Oppretter `offers`-oppføringer koblet til Rema 1000-kjeden
- Forsøker VDA+/EPD-oppslag for hvert EAN for å hente ingredienser og bilder
- Kjøres manuelt som engangsseeding (kan re-kjøres for oppdatering)

Produktlisten fra PDF-en (~70 produkter), eksempel:
```
{ name: "Kokt skinke", ean: "7032069726570", category: "kjøtt", weight: "1000g" }
{ name: "Peanøttsmør", ean: "7032069736890", category: "pålegg", weight: "350g" }
{ name: "Kokosmelk", ean: "7032069105238", category: "kolonial", weight: "330ml" }
...
```

### 2. Legg til "kolonihagen" i søkelogikken

I `search-products/index.ts`:
- Legg til `"kolonihagen"` i `UNIVERSAL_BRANDS`-listen (eller en ny `REMA_BRANDS`-liste)
- I `searchDatabaseFallback`: når `storeCode === "REMA_1000"`, inkluder alltid Kolonihagen-produkter fra `product_sources` som matchende kandidater
- Produktene vil automatisk dukke opp i søk via eksisterende DB-fallback-logikk siden de ligger i `product_sources`

### 3. Berikelse via VDA+

Seed-funksjonen kaller VDA+ (EPD) for hvert EAN for å hente:
- Ingrediensliste
- Produktbilder
- Merkevare-info

Deretter trigges `recompute-master-product` for NOVA-klassifisering.

## Tekniske detaljer
- Ny fil: `supabase/functions/seed-kolonihagen/index.ts`
- Endring: `supabase/functions/search-products/index.ts` (legg til kolonihagen i brand-mapping)
- Endring: `supabase/config.toml` (legg til function-config)
- Ingen nye tabeller eller migrasjoner trengs
- Bruker eksisterende `product_sources`, `products`, `offers`, `chains`-tabeller
- Krever at Rema 1000 finnes som chain i `chains`-tabellen

