# Picki – Smartere Handleopplevelse 🛒

Picki hjelper norske forbrukere med å velge renere, mindre prosesserte matvarer. Appen analyserer produkter ved hjelp av NOVA-klassifisering og foreslår sunnere alternativer basert på brukerens preferanser, allergier og butikkvalg.

**Live:** https://picki.lovable.app

---

## Tech Stack

| Lag | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State | TanStack React Query |
| Routing | React Router v6 |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| AI/ML | OpenAI GPT (NOVA-klassifisering, oppskriftsparsing, intensjonsanalyse) |
| Produkt-APIer | Kassal.app (norske dagligvarer), VDA+/EPD (Tradesolution, ingredienser) |
| Mobile | Capacitor (Android/iOS shell) |
| PWA | vite-plugin-pwa |

---

## Arkitektur

```
┌─────────────────────────────────────────────────────┐
│  React SPA (Vite)                                   │
│  ├── Pages: Dashboard, ListEditor, DinnerExplorer,  │
│  │          Cookbook, ProductDetail, Profile, Auth    │
│  ├── Hooks: useShoppingList, useRecipes, useCookbook │
│  └── Supabase Client (@/integrations/supabase/)     │
└───────────────┬─────────────────────────────────────┘
                │ HTTPS
┌───────────────▼─────────────────────────────────────┐
│  Supabase Edge Functions (Deno)                     │
│  ├── search-products    ← Hovedsøk (Kassal + DB)   │
│  ├── get-product-details← Produktdetaljer per EAN   │
│  ├── classify-nova      ← NOVA 1-4 via OpenAI      │
│  ├── recompute-master   ← Merger sources → products │
│  ├── suggest-items      ← AI autocomplete           │
│  ├── suggest-substitutions ← Erstatningsforslag     │
│  ├── analyze-shopping-intent ← Intensjonsanalyse    │
│  ├── generate-recipe    ← AI oppskriftsgenerering   │
│  ├── generate-recipe-image ← DALL-E oppskriftsbilder│
│  ├── parse-recipe       ← URL→ingredienser parsing  │
│  ├── fetch-epd          ← VDA+ EPD-data             │
│  └── seed-kolonihagen   ← Seed Kolonihagen-produkter│
└───────────────┬─────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────┐
│  Supabase Postgres                                  │
│  ├── products          (master, EAN-unik)           │
│  ├── product_sources   (rå data: EPD/KASSALAPP)     │
│  ├── offers            (EAN↔chain tilgjengelighet)  │
│  ├── chains            (butikkjeder)                │
│  ├── profiles          (brukerpreferanser)          │
│  ├── shopping_lists    (handlelister)               │
│  ├── shopping_list_items                            │
│  ├── recipes / recipe_ingredients                   │
│  ├── user_cookbook / user_cookbook_ingredients         │
│  ├── user_favorite_recipes                          │
│  ├── user_recipe_history                            │
│  └── user_recipe_substitutions                      │
└─────────────────────────────────────────────────────┘
```

---

## Datamodell – Produkter

Produktdata følger en **3-lags pipeline**:

1. **`product_sources`** — Rå data per kilde (EPD, KASSALAPP, MANUAL). Unik på `(ean, source)`.
2. **`products`** — Master-produkt per EAN. Bygges av `recompute-master-product` som velger beste verdi per felt basert på kildeprioritet:
   - `ingredients_raw`: EPD > MANUAL > KASSALAPP
   - `image_url`: EPD > KASSALAPP > MANUAL
   - `name/brand`: EPD > MANUAL > KASSALAPP
3. **`offers`** — Kobler EAN til butikkjeder (chain_id). Brukes for butikkfiltrering.

### NOVA-klassifisering
Produkter klassifiseres automatisk med NOVA 1–4 (ultraprosessert skala) via `classify-nova` edge function (OpenAI). Resultat caches i `products.nova_class`. Re-klassifisering skjer kun når `ingredients_hash` endres.

### Bakgrunns-pipeline (ikke-blokkerende)
```
Bruker søker → Kassalapp API → Score & Sorter → Returner resultater
                                                     ↓ (bakgrunn)
                                               EPD-berikelse (VDA+)
                                                     ↓
                                            Kassalapp detalj-fallback
                                                     ↓
                                          Recompute master product
                                                     ↓
                                        Utvid universelle offers
```

---

## Sider & Ruter

| Rute | Side | Beskrivelse |
|---|---|---|
| `/` | Dashboard | Oversikt, handlelister, hurtigopprettelse |
| `/list/:listId` | ListEditor | Rediger handleliste, søk produkter, shopping mode |
| `/dinner-explorer` | DinnerExplorer | Swipe-basert oppskriftsutforsking |
| `/cookbook` | Cookbook | Brukerens lagrede oppskrifter |
| `/product/:ean` | ProductDetail | Detaljvisning av produkt (ingredienser, NOVA, pris) |
| `/profile` | Profile | Innstillinger, preferanser, butikkvalg |
| `/auth` | Auth | Innlogging/registrering |

---

## Edge Functions

| Funksjon | Beskrivelse | Viktige APIer/secrets |
|---|---|---|
| `search-products` | Hovedsøk. Kaller Kassal.app, scorer/sorterer etter NOVA + preferanser, beriker i bakgrunnen med EPD | `KASSALAPP_API_KEY`, `VDA_CLIENT_ID`, `VDA_CLIENT_SECRET` |
| `get-product-details` | Henter detaljert produktinfo per EAN fra Kassal.app | `KASSALAPP_API_KEY` |
| `classify-nova` | NOVA 1-4 klassifisering via OpenAI basert på ingrediensliste | `OPENAI_API_KEY` |
| `recompute-master-product` | Merger alle `product_sources` til én master `products`-rad | Service role |
| `suggest-items` | AI-drevet autocomplete for handleliste | `OPENAI_API_KEY` |
| `suggest-substitutions` | Foreslår sunnere erstatninger for et produkt | `OPENAI_API_KEY` |
| `analyze-shopping-intent` | Analyserer hva brukeren egentlig leter etter | `OPENAI_API_KEY` |
| `generate-recipe` | Genererer oppskrift fra ingredienser | `OPENAI_API_KEY` |
| `generate-recipe-image` | DALL-E bildegenerering for oppskrifter | `OPENAI_API_KEY` |
| `parse-recipe` | Parser oppskrift-URL til strukturerte ingredienser | `OPENAI_API_KEY` |
| `fetch-epd` | Henter produktdata fra VDA+ (Tradesolution) | `VDA_CLIENT_ID`, `VDA_CLIENT_SECRET` |
| `seed-kolonihagen` | Seeder Kolonihagen-produkter fra katalog + scraping | Service role |

---

## Secrets (Supabase Edge Function Secrets)

Konfigureres i [Supabase Dashboard → Functions → Secrets](https://supabase.com/dashboard/project/hoxoaubghdifiprzfcmq/settings/functions):

| Secret | Bruk |
|---|---|
| `KASSALAPP_API_KEY` | Kassal.app produktsøk-API |
| `OPENAI_API_KEY` | OpenAI GPT for NOVA, oppskrifter, intensjonsanalyse |
| `VDA_CLIENT_ID` | VDA+/EPD OAuth2 client (Tradesolution) |
| `VDA_CLIENT_SECRET` | VDA+/EPD OAuth2 secret |
| `LOVABLE_API_KEY` | Lovable AI features |

Supabase-interne secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) settes automatisk.

---

## Lokal Utvikling

### Forutsetninger
- Node.js 18+ (anbefalt: bruk [nvm](https://github.com/nvm-sh/nvm))
- npm eller bun

### Kom i gang
```bash
git clone <REPO_URL>
cd <PROJECT_DIR>
npm install
cp .env.example .env
# Fyll inn VITE_SUPABASE_* verdier i .env
npm run dev
```

### Miljøvariabler (.env)
```env
VITE_SUPABASE_PROJECT_ID="hoxoaubghdifiprzfcmq"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
VITE_SUPABASE_URL="https://hoxoaubghdifiprzfcmq.supabase.co"
```
> **Merk:** Anon-nøkkelen er en publishable key og trygg for klient-bruk. Private API-nøkler lagres som Supabase Edge Function secrets.

### Tester
```bash
npx vitest          # Kjør alle tester
npx vitest run      # Kjør en gang (CI)
```
Testfiler: `src/lib/*.test.ts`, `src/utils/*.test.ts`

---

## Mappestruktur

```
src/
├── App.tsx                 # Ruter og providers
├── main.tsx                # Entry point
├── index.css               # Design tokens (HSL, Tailwind)
├── pages/                  # Side-komponenter
├── components/             # UI-komponenter
│   ├── ui/                 # shadcn/ui primitiver
│   ├── ShoppingList.tsx    # Handleliste-logikk
│   ├── ShoppingMode.tsx    # Butikkmodus (avkrysning i butikk)
│   ├── ProductSearchInput  # Produktsøk med autocomplete
│   ├── RecipeCard*.tsx     # Oppskriftskort
│   └── Header.tsx          # App-header med navigasjon
├── hooks/                  # Custom React hooks
│   ├── useShoppingList.tsx # CRUD handleliste + items
│   ├── useRecipes.tsx      # Oppskriftshenting
│   ├── useProductSearch.ts # Produktsøk mot edge function
│   └── useProfile.tsx      # Brukerprofil + preferanser
├── integrations/supabase/  # Auto-generert Supabase-klient + typer
├── lib/                    # Utility-funksjoner
│   ├── preferenceAnalysis  # Analyserer brukerpreferanser
│   ├── storeLayoutSort     # Sorterer handleliste etter butikklayout
│   └── textParser          # Parser fritekst til handleliste-items
├── utils/                  # Hjelpefunksjoner
└── data/                   # Statiske data (oppskrifter)

supabase/
├── config.toml             # Edge function-konfig (verify_jwt: false)
├── functions/
│   ├── _shared/            # Delt kode: auth.ts, doh-resolver.ts
│   ├── search-products/    # ~1800 linjer: søk, scoring, berikelse
│   ├── classify-nova/      # NOVA-klassifisering via OpenAI
│   ├── recompute-master-product/  # Master-produkt merger
│   └── ...                 # Andre edge functions
└── migrations/             # SQL-migrasjoner (auto-kjørt)
```

---

## Viktige Konsepter

### Produktscoring
`search-products` scorer produkter basert på:
- **Navnematch** (fuzzy + eksakt)
- **NOVA-klasse** (lavere = bedre for renvare-brukere)
- **Allergenfiltrering** (ekskludering basert på brukerprofil)
- **Butikktilgjengelighet** (offers-tabell)
- **Merkevare-boost** (Kolonihagen får boost for Rema 1000-brukere)
- **Økologisk-preferanse** (ekstra boost)

### Universelle Merkevarer
Produkter fra kjente norske merker (Tine, Gilde, Prior, etc.) får automatisk `offers`-oppføringer i alle kjeder, slik at de vises uavhengig av brukerens butikkvalg.

### Kolonihagen-integrasjon
Kolonihagen (Rema 1000-eksklusivt) er seedet med ~164 produkter. Disse får:
- 15% boost for Rema 1000-brukere
- 20% ekstra boost for brukere med økologisk-preferanse
- Ingredienser scrapet fra kolonihagen.no

### RLS (Row-Level Security)
- **Master-data** (`products`, `product_sources`, `chains`, `offers`): Lesbar for alle, kun service role kan skrive
- **Brukerdata** (`shopping_lists`, `profiles`, `user_cookbook`): Kun eier kan lese/skrive
- **Oppskrifter** (`recipes`): Kun publiserte oppskrifter er lesbare

---

## Deployment

- **Frontend:** Publiseres via Lovable (Share → Publish) eller custom domain
- **Edge Functions:** Deployes automatisk ved push
- **Database-migrasjoner:** Kjøres automatisk av Supabase

---

## Kjente Begrensninger

- `search-products/index.ts` er ~1800 linjer og bør refaktoreres
- Kassal.app har rate limits (429) — edge functions har retry-logikk
- VDA+ DNS kan feile — DoH-resolver brukes som fallback
- NOVA-klassifisering krever ingrediensliste — produkter uten ingredienser får ikke NOVA-score
