


## Plan: Bedre utnyttelse av VDA+ API og universelle produkter

### Implementert

1. **VDA+ berikelse forbedret** — Økt fra 5 til 10 EANs per søk, med detaljert logging (DNS, token, HTTP status, felt-tilgjengelighet)
2. **Kassalapp detalj-fallback** — Produkter som mangler ingredienser/bilde berikers via `kassal.app/api/v1/products/ean/{ean}` (maks 5 per søk)
3. **Auto masterprodukt-recompute** — `recompute-master-product` trigges automatisk for alle berikede EANs etter EPD + Kassalapp enrichment
4. **DB-fallback søk** — Når Kassalapp returnerer < 10 treff, søkes `product_sources` for cachede produkter (f.eks. Tine-produkter funnet i Meny vises for Kiwi-brukere via offers-tabellen)
5. **Universelle merkevarer** — Produkter fra Tine, Gilde, Prior, Stabburet, Norvegia, Jarlsberg, m.fl. får automatisk offers-oppføringer i alle kjeder
6. **Kolonihagen-integrasjon** — ~90 Kolonihagen-produkter (Rema 1000-eksklusive, økologiske) seedet fra PDF-katalog med EAN-numre. Edge function `seed-kolonihagen` upsert-er til `product_sources`, `products` og `offers`. VDA+/EPD-berikelse kjøres automatisk. Søkelogikken gir Kolonihagen-produkter 15% boost for Rema 1000-brukere og ytterligere 20% for brukere med økologisk-preferanse.
7. **Kolonihagen.no scraping** — Seed-funksjonen scraper kolonihagen.no for ingredienser, allergener, næringsinnhold, bilder og beskrivelser. ~115 produkter totalt inkl. nye produkter fra nettsiden (te, tex mex, pasta, is, nøtter, guanciale, yoghurt gresk type). Data lagres i `product_sources` (payload med nutrition/allergens) og `products` (ingredients_raw, image_url). Recompute-master-product trigges for NOVA-klassifisering.

### Bakgrunn-pipeline (ikke-blokkerende)
```
Kassalapp-søk → DB-fallback → Score & Sorter → Returner
                                                    ↓ (bakgrunn)
                                              EPD-berikelse
                                                    ↓
                                           Kassalapp detalj-fallback
                                                    ↓
                                         Recompute master product
                                                    ↓
                                       Utvid universelle offers
```
