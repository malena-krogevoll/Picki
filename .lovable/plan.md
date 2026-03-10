
Mest sannsynlige hovedårsak: problemet er ikke bare “manglende data”, men at handlemodus låser seg til feil kandidat og deretter slutter å prøve på nytt.

Plan

1. Bekrefte og isolere feilen i dagens flyt
- Jeg har allerede funnet at `shopping_list_items.selected_product_ean` er `null` for varene i listen, også for “Kokt skinke”.
- Samtidig ligger kandidatlisten i `product_data` som en egen cache-struktur med `selectedIndex`.
- Det betyr at appen viser én valgt kandidat i UI, men databasen vet ikke hvilken EAN som faktisk er valgt.

2. Fikse den viktigste logiske feilen i ShoppingMode
- Enrichment i `ShoppingMode` markerer en EAN som “ferdig forsøkt” før kallene faktisk lykkes.
- Hvis `get-product-details` feiler med 429/500, eller eksakt EAN ikke finnes i `product_sources`, blir den EAN-en i praksis blokkert fra nye forsøk.
- Jeg vil endre dette slik at en EAN bare markeres som ferdig når vi faktisk fikk bedre data, eller når vi eksplisitt vet at alle kilder er tomme.

3. Fikse valg/persistens for faktisk produkt
- Når første produktliste lastes inn, må valgt kandidat også skrives til `selected_product_ean`.
- Når brukeren bytter alternativ i handlemodus, må både `selectedIndex` og `selected_product_ean` oppdateres.
- Da blir handlemodus, produktdetaljer og cache enige om hvilken vare vi jobber med.

4. Endre berikelsesstrategien for generiske varer som “kokt skinke”
- I dag forsøkes bare valgt/topp kandidat.
- For generiske søk vil jeg berike de 2–3 øverste kandidatene per vare, ikke bare indeks 0.
- Deretter kan appen enten:
  - beholde valgt kandidat, men vise bedre data hvis den blir beriket, eller
  - automatisk promotere første kandidat som faktisk har både bilde og ingredienser når nåværende valgt kandidat mangler dette.
- Dette er sannsynligvis nøkkelen for “kokt skinke”, siden databasen allerede har flere andre skinke-EAN-er med gode Kassalapp-data.

5. Gjøre edge-function-feil ikke-blokkerende
- `get-product-details` kaster 500 på Kassalapp 429.
- I stedet bør frontend kunne tolke rate limit som “ingen live-data akkurat nå”, ikke som hard feil.
- Jeg vil derfor gjøre flyten robust slik at cached `product_sources` brukes først, og live detail bare er siste fallback.
- Om live-kallet feiler, skal UI fortsatt kunne bruke data fra andre kandidater eller eksisterende cache.

6. Rydde opp i stale cache ved butikkbytte og nytt valg
- `ShoppingMode` remountes riktig ved butikkbytte, men enrichment-triggeren følger ikke valgt produkt godt nok.
- Jeg vil nullstille enrichment-state når:
  - butikk endres
  - valgt produkt endres
  - nye søkeresultater kommer inn
- Da unngår vi at gamle “allerede forsøkt”-markeringer lever videre.

7. Legge inn målrettet logging for å stoppe gjetting
- Logg per vare:
  - itemId
  - valgt EAN
  - selectedIndex
  - om bilde mangler
  - om ingredienser mangler
  - hvilke kilder som faktisk svarte
  - om valgt kandidat ble byttet/promotert
- Dette vil gjøre det lett å se hvorfor akkurat “kokt skinke” ender i feil state.

Funn fra dypdykket
- “Kokt skinke” i listen har cachede kandidater.
- Valgt kandidat er indeks 0 og mangler ingredienser.
- Samtidig finnes det andre skinke-EAN-er i `product_sources` med både bilde og ingredienser.
- Dermed er problemet sannsynligvis at UI holder fast ved en dårlig toppkandidat, ikke at systemet mangler data totalt.

Tekniske detaljer
- Berørt frontend:
  - `src/components/ShoppingMode.tsx`
  - `src/hooks/useShoppingList.tsx`
- Berørt edge function:
  - `supabase/functions/get-product-details/index.ts`
- Ingen nye tabeller trengs.
- Eksisterende RLS ser tilstrekkelig ut for denne feilen.
- Jeg vil også fikse den separate React-advarselen i `src/components/ui/skeleton.tsx` ved å bruke `forwardRef`, siden den nå støyer i konsollen under debugging.

Forventet resultat etter implementasjon
- Handlemodus og produktdetaljer bruker samme faktiske valgte EAN.
- “Kokt skinke” kan hente inn bilde/ingredienser fra riktig kandidat i stedet for å bli låst til en tom kandidat.
- Midlertidige 429-feil gjør ikke at varen blir permanent stående uten data.
- Bytte frem og tilbake mellom butikker blir mer deterministisk og lettere å feilsøke.
