

## Forbedre unit-testdekning

### Nye tester for eksisterende filer

**1. `textParser.test.ts` — legg til edge cases**
- Bullet point-lister (`• melk`, `- egg`)
- Nummererte lister (`1. melk`, `2) egg`)
- Duplikathåndtering
- Svært lange input-strenger

**2. `preferenceAnalysis.test.ts` — utvid**
- Test `organic`-preferanse (økologisk matching)
- Test `priority_order`-logikken som påvirker scoring
- Test `lowest_price`-preferanse
- Flere allergen-kombinasjoner

**3. `storeLayoutSort.test.ts` — flere edge cases**
- Case-insensitivity (`Melk` vs `melk`)
- Tom streng input
- Sammensatte produktnavn (`lettmelk`, `skummetmelk`)

### Nye testfiler

**4. `src/utils/countryUtils.test.ts`**
- Test `getCountryFromEAN()` — norske EAN (70-79), svenske (73), danske (57), ukjente
- Test flagg-emoji-mapping

**5. `src/lib/novaClassifier.test.ts`** (krever ekstraksjon)
- Ekstraher NOVA-klassifiseringslogikken fra edge function til en delt modul `src/lib/novaClassifier.ts`
- Test sterke UPF-signaler, svake signaler, real food, batch-klassifisering
- Denne logikken er kompleks (~200 linjer regex-regler) og fortjener grundig testing

### Filer som endres/opprettes
- `src/lib/textParser.test.ts` — utvides
- `src/lib/preferenceAnalysis.test.ts` — utvides
- `src/lib/storeLayoutSort.test.ts` — utvides
- `src/utils/countryUtils.test.ts` — ny fil
- `src/lib/novaClassifier.ts` — ny fil (ekstrahert fra edge function)
- `src/lib/novaClassifier.test.ts` — ny fil

