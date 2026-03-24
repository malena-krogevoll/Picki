

## Utvide fersk-produkt-gjenkjenning til flere merker og butikker

### Problem
Merker som Bama, Vilje, Prima og "kg pris"-produkter selger fersk frukt/grønt uten ingrediensliste, men disse merkene har OGSÅ prosesserte produkter (f.eks. Bama juice, Bama salater med dressing). Enkel merke-matching fungerer derfor ikke.

### Løsning: Kombinert merke + kategori/navnesjekk

I stedet for å bare sjekke "FG"-prefiks, bruker vi en **to-trinns logikk**:

1. **Kjente ferskvare-merker** defineres i en liste: `Bama`, `Vilje`, `Prima`, `First Price` (Coop), `Änglamark`, `Xtra`
2. Et produkt fra disse merkene klassifiseres som fersk NOVA 1 **kun hvis**:
   - Det er i en fersk kategori (fg, frukt, grønt, etc.), **ELLER**
   - Produktnavnet matcher et kjent ferskvare-mønster (f.eks. inneholder et frukt/grønnsak-ord fra `SIMPLE_PRODUCE_TERMS` og IKKE inneholder prosesserte indikatorer som "juice", "smoothie", "salat med", "dressing")
3. **"kg pris"**-produkter: Produkter med "kg" i pris-feltet eller "pr kg" i navnet er typisk løsvekt ferskvare og gis ekstra boost

### Filer som endres

**1. `src/lib/novaClassifier.ts` + `supabase/functions/_shared/novaClassifier.ts`** (synkronisert)
- Utvide `isFreshProduceByName`-sjekken fra bare `/^fg\b/` til også å matche kjente ferskvare-merker + produksjonsord
- Ny liste: `FRESH_PRODUCE_BRAND_PREFIXES` med merker som kan ha ferskvarer
- Ny liste: `PROCESSED_PRODUCT_INDICATORS` (juice, smoothie, salat med, dressing, etc.) for å ekskludere prosesserte produkter fra samme merke
- Logikk: `isFreshProduce = isFreshProduceByCategory || (isFreshProduceBrand && containsProduceName && !hasProcessedIndicator) || isFGPrefix`

**2. `src/components/ShoppingMode.tsx`**
- Oppdatere `isFreshProduceProduct()` med samme logikk som klassifisereren

**3. `supabase/functions/search-products/index.ts`**
- Legge til "kg pris"-boost i `applyProduceScoring`
- Legge til merkevare-boost for ferskvare-merker i riktig kategori

**4. `src/lib/novaClassifier.test.ts`**
- Nye tester: "Bama Epler" → NOVA 1, "Bama Juice Eple" → IKKE NOVA 1 (vanlig klassifisering)
- "Prima Bananer" → NOVA 1, "Vilje Gulrot 1kg" → NOVA 1

### Teknisk design

```text
Product arrives without ingredients
  │
  ├─ Category matches FRESH_PRODUCE_CATEGORIES? → NOVA 1
  │
  ├─ Name starts with "FG"? → NOVA 1
  │
  ├─ Brand in FRESH_PRODUCE_BRANDS?
  │   ├─ Name contains known produce term (eple, banan, gulrot...)?
  │   │   ├─ Name contains processed indicator (juice, smoothie...)? → Normal flow
  │   │   └─ No processed indicator → NOVA 1
  │   └─ No produce term → Normal flow
  │
  ├─ Has "pr kg" or "kg" pricing pattern? 
  │   └─ + category/name suggests produce → NOVA 1
  │
  └─ High risk category? → NOVA 4 estimate
```

Syntetisk ingrediens-navn utledes ved å strippe merkevare-prefiks og deskriptorer (f.eks. "Bama Epler Røde 1kg" → "epler").

