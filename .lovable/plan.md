

# Plan: Integrer VDA+ (VetDuAt) API som bakgrunnsberikelse

## Oversikt

Opprette en ny `fetch-epd-product` Edge Function som henter produktdata fra VetDuAt/Tradesolution sitt REST API via GTIN (EAN), lagrer resultatene i `product_sources` med kilde `EPD`, og deretter trigger `recompute-master-product` for a oppdatere masterproduktet. Funksjonen kalles asynkront fra `search-products` etter at Kassalapp-resultatene er returnert til brukeren.

## Steg

### 1. Lagre VDA+ API-nokkel som hemmelighet

VDA+ API-et krever autentisering. Vi trenger en API-nokkel eller OAuth-credentials fra Tradesolution. Denne lagres som Supabase Edge Function secret (`VETDUAT_API_KEY` eller `VETDUAT_CLIENT_ID` + `VETDUAT_CLIENT_SECRET` avhengig av auth-metoden).

### 2. Opprett `fetch-epd-product` Edge Function

Ny fil: `supabase/functions/fetch-epd-product/index.ts`

Funksjonen:
- Mottar en eller flere GTIN/EAN som input (`{ gtin: string }` eller `{ gtins: string[] }`)
- Kaller VDA+ API med POST og GTIN
- Mapper VDA+-responsen til `product_sources`-formatet:
  - `ean` = GTIN fra responsen
  - `source` = `"EPD"`
  - `source_product_id` = `epdNr` (unik EPD-identifikator)
  - `name` = `produktnavn`
  - `brand` = `firmaNavn`
  - `image_url` = `bildeUrl`
  - `ingredients_raw` = `ingredienser`
  - `payload` = hele VDA+-responsen (inkl. allergener, deklarasjoner, merkeordninger, opprinnelsesland)
- Upsert i `product_sources` (on conflict `ean, source`)
- Kaller `recompute-master-product` internt for a oppdatere masterproduktet
- Returnerer resultatet

### 3. Registrer i `supabase/config.toml`

Legg til:
```toml
[functions.fetch-epd-product]
verify_jwt = false
```

### 4. Koble bakgrunnsberikelse fra `search-products`

I `search-products/index.ts`, etter at `cacheProductsToDatabase()` er kalt, legg til en asynkron bakgrunnsjobb som:
- Samler alle unike EAN-numre fra sokeresultatene
- Sjekker hvilke EAN som allerede har en `EPD`-kilde i `product_sources` (for a unnga unodvendige API-kall)
- For EAN uten EPD-kilde: kaller `fetch-epd-product` i bakgrunnen (fire-and-forget)
- Begrenset til maks 5-10 EAN per sok for a unnga rate limiting

Flyten blir:

```text
Bruker soker "melk"
    |
    v
search-products henter fra Kassalapp
    |
    v
Returnerer resultater til bruker (0 ms ekstra latens)
    |
    v  (asynkront i bakgrunnen)
cacheProductsToDatabase() -- lagrer Kassalapp-data
    |
    v  (asynkront i bakgrunnen)
enrichFromEPD() -- for EAN uten EPD-kilde:
    |-- kaller fetch-epd-product for hver EAN
    |-- upsert i product_sources med source=EPD
    |-- trigger recompute-master-product
    v
Masterproduktet oppdateres med bedre ingrediensdata
```

### 5. VDA+ datamapping

Felter som lagres i `payload` (jsonb) for fremtidig bruk:

| VDA+ felt | Bruk i Picki |
|---|---|
| `ingredienser` | `ingredients_raw` - hoyprioritets kilde for NOVA |
| `bildeUrl` | `image_url` - produsentbilde |
| `produktnavn` | `name` |
| `firmaNavn` | `brand` |
| `allergener[]` | Strukturert allergendata med verdier ("Inneholder"/"Inneholder ikke"/"Kan inneholde spor") |
| `deklarasjoner[]` | Naeringsdata (kcal, protein, fett, karbohydrater, salt) |
| `merkeordninger[]` | Nokkelhullet, Nyt Norge, etc. |
| `opprinnelsesland` | Opprinnelsesland |
| `varegruppenavn` | Produktkategori |

---

## Teknisk detaljer

### `fetch-epd-product/index.ts` - pseudokode

```text
1. Valider auth (validateAuth)
2. Parse request body: { gtin: string } eller { gtins: string[] }
3. For hver GTIN:
   a. POST til VDA+ API med { "gtin": <gtin> }
   b. Parse respons (kan returnere 1+ produkter per GTIN)
   c. For hvert produkt:
      - Map til product_sources-format
      - Upsert i product_sources med source="EPD"
   d. Kall recompute-master-product for denne EAN
4. Returner sammendrag
```

### Bakgrunnsberikelse i `search-products` - ny funksjon

```text
async function enrichFromEPD(eans: string[]): Promise<void>
  1. Query product_sources WHERE ean IN (eans) AND source = 'EPD'
  2. Filtrer ut EAN som allerede har EPD-kilde
  3. For remaining EAN (maks 5):
     - Kall fetch-epd-product edge function
  4. Best-effort, ingen feil kastes
```

### Hva endres ikke

- Brukeropplevelsen pavirkes ikke (null ekstra latens)
- `recompute-master-product` fungerer allerede med EPD-prioritet
- `products`-tabellen trenger ingen skjemaendringer
- `product_sources`-tabellen stotter allerede `EPD` som source type
- Ingen databasemigrasjoner trengs

### Avhengigheter

- VDA+ API-nokkel/credentials fra Tradesolution (ma skaffes av bruker)
- Avklare VDA+ autentiseringsmetode (API-nokkel vs OAuth2)

