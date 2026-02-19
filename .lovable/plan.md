
# Unit-tester for Picki

## Oversikt
Sette opp testrammeverk (Vitest) og skrive unit-tester for de fire viktigste utility-modulene i prosjektet.

## Hva blir testet

### 1. `src/lib/textParser.ts` - Parsing av handleliste-tekst
- Parsing av enkle varer ("melk, egg, brød")
- Mengder ("2 bananer", "3x epler")
- Norske enheter fjernes ("200 g pasta" blir "pasta")
- Tilberedningsmåter fjernes ("paprika i terninger" blir "paprika")
- Notater i parentes bevares
- Tomme og ugyldige input
- `formatParsedItem` formattering

### 2. `src/utils/ingredientUtils.ts` - Fjerning av enheter fra ingredienser
- "800g tomater" blir "tomater"
- "2 ss olivenolje" blir "olivenolje"
- "1 dl melk" blir "melk"
- Ingredienser uten enheter forblir uendret

### 3. `src/lib/storeLayoutSort.ts` - Butikk-kategorisering
- Produkter kategoriseres riktig (melk = Meieriprodukter, laks = Fisk og sjomat)
- Ukjente produkter far "Annet"-kategori
- `groupItemsByCategory` grupperer og sorterer riktig

### 4. `src/lib/preferenceAnalysis.ts` - Preferanseanalyse
- Allergensjekk (gluten, melk, egg osv.)
- Diettkontroll (vegan, vegetar)
- Dyrevelferd-matching
- Lokalmat-matching
- Match-score beregning

## Teknisk oppsett

### Nye filer
| Fil | Beskrivelse |
|-----|-------------|
| `vitest.config.ts` | Vitest-konfigurasjon med jsdom og path aliases |
| `src/test/setup.ts` | Test setup med matchMedia mock |
| `src/lib/textParser.test.ts` | ~15 tester |
| `src/utils/ingredientUtils.test.ts` | ~6 tester |
| `src/lib/storeLayoutSort.test.ts` | ~8 tester |
| `src/lib/preferenceAnalysis.test.ts` | ~10 tester |

### Endringer i eksisterende filer
- `tsconfig.app.json`: Legg til `"vitest/globals"` i `types`

### Avhengigheter (devDependencies)
- `@testing-library/jest-dom`
- `@testing-library/react`
- `jsdom`
- `vitest`
