

# Plan: Bedre utnyttelse av VDA+ API og universelle produkter

## Analyse av nåsituasjon

Databasen har **2379 produktkilder, alle fra Kassalapp, null fra EPD/VDA+**. Dette betyr at VDA+ berikelsen feiler stille -- sannsynligvis DNS-problemer som ikke løses av DoH-resolveren, eller token-feil. Av de 2379 Kassalapp-produktene mangler **425 ingredienser** og **23 bilder**.

Kun **1 masterprodukt** i `products`-tabellen -- `recompute-master-product` kalles aldri automatisk etter berikelse.

Tilbuds-tabellen (`offers`) viser at produkter allerede er koblet til kjeder (coop: 1296, meny: 1283), men Tine-produkter o.l. som finnes i alle kjeder registreres bare i den kjeden de ble søkt opp i.

## Problemene

1. **VDA+ berikelse feiler stille** -- ingen EPD-data i databasen
2. **Masterprodukt-pipelinen er brutt** -- `recompute-master-product` trigges aldri automatisk
3. **Bare 5 EAN berikers per søk** -- for konservativt
4. **Ingen DB-fallback for søk** -- produkter som allerede er cachet (f.eks. Tine-produkter) gjenbrukes aldri som alternativer
5. **Universelle merkevarer** (Tine, Gilde, Stabburet) vises bare for butikken de først ble funnet i

## Plan

### Steg 1: Diagnostiser og fiks VDA+ tilkobling

Legg til eksplisitt feillogging og en diagnostisk test i `search-products` sin `enrichWithEpd` funksjon. Test med et kjent norsk EAN (f.eks. `7038010006609` - Tine Kesam). Logg detaljert: DNS-status, token-status, HTTP-respons. Dersom VDA+ forblir utilgjengelig, bruk Kassalapp `get-product-details` som berikelseskilde for ingredienser/bilder.

### Steg 2: Automatiser masterprodukt-oppdatering

Etter at `enrichWithEpd` eller `cacheProductsToDatabase` kjører, kall automatisk `recompute-master-product` for hvert EAN som ble oppdatert. Dette sikrer at `products`-tabellen alltid har den beste informasjonen fra alle kilder.

### Steg 3: Øk berikelseskapasitet

- Øk fra 5 til **10 EAN** per søk for EPD-berikelse
- Legg til Kassalapp-detaljoppslag (via `get-product-details`) som sekundær berikelseskilde for produkter som mangler ingredienser/bilde -- maks 5 per søk

### Steg 4: DB-fallback for søkeresultater

Når Kassalapp-søk returnerer få resultater for en butikk, søk også i `product_sources`-tabellen etter matchende produkter som allerede er cachet. Merk disse som "Tilgjengelig basert på tidligere data". Dette gir:
- Tine-produkter (lagret fra et søk i Meny) vises også for Kiwi-brukere
- Produkter med EPD-data som allerede er beriket gjenbrukes

### Steg 5: Universelle merkevarer via offers-tabellen

Når et produkt caches fra Kassalapp, sjekk om merkevaren er "universell" (Tine, Gilde, Prior, Stabburet, Norvegia, etc.). For universelle merkevarer, opprett automatisk offers-oppføringer for alle kjente kjeder, ikke bare den som ble søkt i. Dette gjøres via en enkel hardkodet liste i `search-products`.

### Teknisk implementasjon

**Fil: `supabase/functions/search-products/index.ts`**
- Utvid `enrichWithEpd`: Bedre logging, øk til 10 EAN, legg til Kassalapp-detalj-fallback
- Legg til `triggerMasterRecompute(eans)` som kaller recompute etter berikelse
- Legg til `searchDatabaseFallback(query, storeCode)` som søker i `product_sources`
- Legg til `expandUniversalOffers(candidates)` for universelle merkevarer
- Integrer DB-fallback i hovedflyten: Kjør Kassalapp-søk som nå, men merg inn DB-treff som supplement

**Fil: `supabase/functions/search-products/index.ts` (hovedflyt)**
```text
Kassalapp-søk (primær)
    ↓
DB-fallback søk (supplement hvis < 10 treff)
    ↓
Score + Sorter (renvare først, pris sekundært)
    ↓
Bakgrunn: EPD-berikelse → Kassalapp-detalj-fallback → Recompute master
    ↓
Bakgrunn: Utvid offers for universelle merker
```

**Kjernefunksjonalitet bevart:**
- Renvare-alternativet prioriteres alltid øverst
- Butikkfiltrering fungerer som før
- Hvis ingen renvare finnes, vises tilgjengelige varer uansett
- DB-fallback-produkter scorer lavere enn ferske Kassalapp-treff

### Ingen databaseendringer nødvendig
Eksisterende tabeller (`product_sources`, `products`, `offers`, `chains`) dekker alle behov.

