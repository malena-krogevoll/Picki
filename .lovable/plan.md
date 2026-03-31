

## Favoritt-produkter

### Konsept
Brukeren kan markere et produkt som favoritt fra produktdetaljer-siden. Når en vare som matcher favoritten legges i handlelisten (f.eks. "tomatsaus"), blir favorittproduktet alltid vist som førstevalg -- uavhengig av Picki sin rangering. Alternativene er fortsatt tilgjengelige under.

### Databaseendringer

**Ny tabell: `user_favorite_products`**
```sql
create table public.user_favorite_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ean text not null,
  product_name text not null,
  brand text,
  image_url text,
  search_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, ean)
);
alter table public.user_favorite_products enable row level security;
-- RLS: brukere kan bare se/endre sine egne favoritter
```

`search_terms` er nøkkelen: når brukeren favorittmarkerer "Mutti Polpa Finknust Tomat", lagres automatisk avledede søketermer som `['tomatsaus', 'tomat', 'polpa']` basert på produktnavn + den opprinnelige handleliste-varen. Dette gjør at systemet vet hvilke handleliste-oppføringer som skal matche favoritten.

### Endringer per fil

**1. `src/pages/ProductDetail.tsx`**
- Ny favorittknapp (hjerte-ikon, allerede importert som `Heart`) i produkt-headeren
- Hook for å sjekke/toggle favoritt-status mot `user_favorite_products`
- Når man favorittmarkerer: lagrer EAN, produktnavn, merke, bilde, og utleder `search_terms` fra produktnavn (splitter på ord, fjerner støy)

**2. Ny hook: `src/hooks/useFavoriteProducts.tsx`**
- `getFavoriteForQuery(query: string)` -- sjekker om en handleliste-vare matcher en favoritt via `search_terms`
- `toggleFavorite(ean, productName, brand, imageUrl, searchTerms)` -- legger til/fjerner favoritt
- `isFavorite(ean)` -- sjekker om et produkt er favoritt
- Cacher favoritter i minnet for rask tilgang

**3. `src/components/ShoppingMode.tsx`**
- Etter at produktsøk er fullført for en vare, sjekker om brukeren har en favoritt som matcher vare-navnet
- Hvis ja: finn favorittproduktet i søkeresultatene (match på EAN) og flytt det til index 0
- Hvis favoritten ikke finnes i søkeresultatene (f.eks. utsolgt i denne butikken), vis en melding om at favoritten ikke er tilgjengelig
- Vis et lite hjerte-ikon på favoritt-produktet i listen

**4. `src/hooks/useFrequentItems.ts`**
- Favoritter kan vektes opp i forslag-algoritmen: produkter som er favorittmarkert gir et signal om at brukeren handler denne typen vare ofte

### Brukerflyt

```text
Produktdetaljer (ProductDetail)
  ├─ [♡] Favorittknapp i header → toggle favoritt
  └─ Toast: "Lagt til som favoritt for 'tomatsaus'"

Handlemodus (ShoppingMode)
  ├─ Bruker har "tomatsaus" i listen
  ├─ Søk returnerer 5 produkter, Mutti Polpa er #3
  ├─ System: Mutti Polpa er favoritt → flyttes til #1
  ├─ Vises med ♥-ikon og "Din favoritt" badge
  └─ Alternativer fortsatt tilgjengelige under
```

### Matching-logikk for søketermer

Når et produkt favorittmarkeres, utledes søketermer automatisk:
- Produktnavn tokeniseres: "Mutti Polpa Finknust Tomat" → `['mutti', 'polpa', 'tomat', 'tomatsaus']`
- Handleliste-kontekst legges til hvis tilgjengelig (f.eks. varen het "tomatsaus")
- Ved søk i ShoppingMode: hvis vare-navnet (f.eks. "tomatsaus") overlapper med en favoritts `search_terms`, promoteres favoritten

### Begrensninger
- Favoritter gjelder per bruker og er butikk-uavhengige (EAN-basert)
- Hvis favorittproduktet ikke finnes i butikken, vises vanlig rangering + info-melding
- Maks 50 favoritter per bruker (UX-begrensning, ikke teknisk)

