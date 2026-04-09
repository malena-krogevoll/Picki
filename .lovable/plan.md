

## Analyse: Hvorfor databasen ikke utnyttes fullt

### Problem 1: 2,703 produkter i `product_sources` finnes ikke i `products`-tabellen
- `product_sources` har 3,593 unike EAN-er, men `products` bare 890
- Søket bruker `product_sources` kun som **fallback** (linje 1019-1032), og bare når Kassalapp-API gir < 10 resultater
- Hvis Kassalapp returnerer 10+ treff, søkes aldri i databasen — selv om bedre produkter finnes der

### Problem 2: Synonym-ekspansjon avbrytes for tidlig
- Linje 966: Hvis første søk gir 10+ resultater, hoppes synonymer over (`"Sufficient results from first query, skipping synonyms"`)
- Søk etter "kremost" returnerer kanskje generiske produkter fra Kassalapp, men Snøfrisk og Philadelphia (som finnes i DB) blir aldri sjekket

### Problem 3: DB-fallback søker bare på `name/brand ILIKE`
- Funksjonen `searchDatabaseFallback` (linje 340-447) søker kun i `product_sources` — aldri i `products`-tabellen
- Den bruker ikke synonym-mappingen som allerede eksisterer (200+ oppføringer)
- Begrenset til 30 resultater

### Problem 4: `product_sources` → `products` pipeline er ufullstendig
- Produkter som caches til `product_sources` under søk blir ikke automatisk klassifisert (NOVA) og lagt inn i `products`
- `recompute-master-product` kjøres kun for de 10 øverste resultatene som bakgrunnsoppgave

---

## Foreslått plan

### 1. Alltid søk i databasen — ikke bare som fallback
Endre `search-products` til å kjøre Kassalapp-søk og DB-søk **parallelt**. Merge resultatene og dedupliser på EAN. Dette sikrer at produkter vi allerede kjenner til alltid vurderes.

### 2. Utvid DB-søket med synonym-mapping
Gjenbruk `searchSynonyms`-mappingen i `searchDatabaseFallback`. Når brukeren søker "kremost", søk også etter "snøfrisk", "philadelphia", "buko" osv. i databasen.

### 3. Søk i både `product_sources` OG `products`-tabellen
DB-fallback ignorerer `products`-tabellen. Søk i begge og kombiner for bredere dekning.

### 4. Fjern "skip synonyms if 10+ results"-logikken
La synonym-søk alltid kjøre (opp til 2 varianter som i dag), uavhengig av antall resultater fra første søk. Bruk heller deduplicering for å holde ytelsen.

### 5. Bulk-klassifiser ukjente produkter
Kjør `recompute-master-product` for product_sources-EAN-er som mangler i products-tabellen. Dette er en engangsjobb som fyller inn de 2,703 manglende produktene.

---

### Tekniske endringer

| Fil | Endring |
|-----|---------|
| `supabase/functions/search-products/index.ts` | (1) Kjør DB-søk parallelt med Kassalapp, ikke som fallback. (2) Bruk synonym-mapping i DB-søk. (3) Søk i `products`-tabellen i tillegg til `product_sources`. (4) Fjern early-exit på 10+ resultater for synonymer. |
| `supabase/functions/discover-clean-products/index.ts` | Legg til en "backfill"-modus som klassifiserer eksisterende `product_sources` som mangler i `products` |

### Forventet effekt
- Søk etter "kremost" vil alltid finne Snøfrisk, Philadelphia, Castello, Coop Kremost osv. fra DB — selv om Kassalapp-API returnerer nok generiske treff
- Alle 3,593 kjente produkter blir søkbare, ikke bare de 890 som er klassifisert
- Synonym-ekspansjon fungerer også mot lokal database

