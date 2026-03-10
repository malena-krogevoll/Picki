

# Berike Kolonihagen-produkter med data fra kolonihagen.no

## Hva og hvorfor

Kolonihagen-produktene i databasen mangler ingredienser, bilder og næringsdata fordi de ikke finnes i Kassalapp eller VDA+. Nettsiden kolonihagen.no har alt dette per produkt. Vi legger til en scraping-steg i `seed-kolonihagen` som henter denne informasjonen og lagrer den i `product_sources` og `products`.

## Tilnærming

### 1. Utvid produktdatamodellen i seed-funksjonen

Legg til et `url`-felt per produkt i `KOLONIHAGEN_PRODUCTS`-listen som peker til produktsiden på kolonihagen.no (f.eks. `https://www.kolonihagen.no/produkt/peanottsmor`). Disse URL-ene er allerede kjent fra produktkatalogen på nettsiden.

### 2. Scrape hver produktside

Etter den eksisterende seed-logikken (upsert til `product_sources`, `products`, `offers`), legg til et nytt steg:

- For hvert produkt med en URL, fetch produktsiden
- Parse markdown-responsen for å ekstrahere:
  - **Ingredienser** (tekst mellom "### Ingredienser" og neste seksjon)
  - **Næringsinnhold** (energi, fett, karbohydrater, protein, salt)
  - **Produktbilde** (fra image-URL i markdown)
  - **Allergener** (utledet fra ingredienser, f.eks. melk, gluten, nøtter)
- Bruk vanlig `fetch` mot kolonihagen.no — ingen Firecrawl nødvendig da sidene er statiske

### 3. Oppdater databasen med berikede data

- Oppdater `product_sources` med `ingredients_raw` og `image_url`
- Oppdater `products`-tabellen med `ingredients_raw` og `image_url`
- Lagre næringsdata og allergener i `payload`-feltet
- Trigger `recompute-master-product` for NOVA-klassifisering

### 4. Kartlegg alle produkt-URL-er

Basert på produktkatalogen fra nettsiden, legger vi til URL for alle ~90 produkter. Noen nye produkter fra nettsiden som mangler i listen (guanciale, yoghurt gresk type, chai urtete, salsa, tacokrydder, tortillachips, tortillas, bringebærsorbet, latte macchiato is, vaniljeis, pistasjis, pizzaolje, mais, mørk sjokolade, cashewnøtter, peanøtter, pesto rød, amorini, pappardelle, tortiglioni, cerignola oliven, hylleblomstdrikk, rabarbrasaft) legges også til.

## Tekniske detaljer

**Fil som endres:** `supabase/functions/seed-kolonihagen/index.ts`

- Nytt felt `url?: string` i `KolonihagenProduct`-interfacet
- Ny funksjon `scrapeProductPage(url: string)` som parser ingredienser, næringsdata og bilde fra HTML/markdown
- Nytt steg 5 etter EPD-berikelse: "Kolonihagen.no scraping"
- Prosessering i batch (5 om gangen) med 1s delay for å unngå overbelastning
- Graceful fallback: hvis scraping feiler for et produkt, logges feilen og produktet beholdes uten berikelse

**Ingen nye filer eller migrasjoner trengs.** Eksisterende kolonner `ingredients_raw` og `image_url` i `product_sources` og `products` brukes.

