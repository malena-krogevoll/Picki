

## Plan: Bedre utnyttelse av VDA+ API og universelle produkter

### Implementert

1. **VDA+ berikelse forbedret** — Økt fra 5 til 10 EANs per søk, med detaljert logging (DNS, token, HTTP status, felt-tilgjengelighet)
2. **Kassalapp detalj-fallback** — Produkter som mangler ingredienser/bilde berikers via `kassal.app/api/v1/products/ean/{ean}` (maks 5 per søk)
3. **Auto masterprodukt-recompute** — `recompute-master-product` trigges automatisk for alle berikede EANs etter EPD + Kassalapp enrichment
4. **DB-fallback søk** — Når Kassalapp returnerer < 10 treff, søkes `product_sources` for cachede produkter (f.eks. Tine-produkter funnet i Meny vises for Kiwi-brukere via offers-tabellen)
5. **Universelle merkevarer** — Produkter fra Tine, Gilde, Prior, Stabburet, Norvegia, Jarlsberg, m.fl. får automatisk offers-oppføringer i alle kjeder

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
