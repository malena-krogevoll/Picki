

## Utvid NOVA-klassifiseringsregler

### Analyse av mangler

Gjennomgang av vanlige norske ingredienslister avslører flere industrielle markører som ikke fanges opp i dag:

### Nye sterke UPF-regler (NOVA 4)

| ID | Mønster | Beskrivelse |
|---|---|---|
| LESITIN | `lesitin`, `lecithin`, `E322` | Industriell emulgator, svært vanlig |
| KASEIN | `kasein`, `kaseinat` | Isolert melkeprotein |
| MONO_DI_GLYCERIDES | `mono- og diglycerider`, `E471` | Industriell emulgator |
| NITRITE | `natriumnitritt`, `kaliumnitritt`, `E250`, `E249` | Industrielt konserveringsmiddel (pølse/bacon) |
| PHOSPHATE | `fosfat`, `difosfat`, `trifosfat`, `E450-E452` | Vanlig i prosessert kjøtt |
| FLAVOR_ENHANCER | `smaksforsterker` | Industriell smakstilsetning |
| CELLULOSE | `cellulose`, `E460` | Industrielt fyllstoff |
| GELATIN | `gelatin` | Industrielt ekstrahert |
| GENERIC_SYRUP | `sirup` (uten prefix allerede dekket) | Industriell søtning |
| POLYDEXTROSE | `polydekstrose` | Syntetisk fiber |
| INULIN | `inulin` | Industrielt ekstrahert fiber |
| CITRIC_ACID_E | `E330` | Industrielt fremstilt sitronsyre |
| SOY_LECITHIN | `soyalesitin` | Vanlig industriell emulgator |
| SODIUM_ALGINATE | `natriumalginat`, `E401` | Fortykningsmiddel |
| CALCIUM_CHLORIDE | `kalsiumklorid`, `E509` | Industriell tilsetning |

### Nye svake UPF-regler (NOVA 3)

| ID | Mønster | Beskrivelse |
|---|---|---|
| PLAIN_STARCH | `stivelse` (uten "modifisert") | Raffinert stivelse |
| CITRIC_ACID | `sitronsyre` | Vanlig tilsetning, lav risiko alene |
| ASCORBIC_ACID | `askorbinsyre` | Tilsetning, ofte som antioksidant |
| SODIUM_CITRATE | `natriumsitrat` | Industriell regulator |
| CALCIUM_CARBONATE | `kalsiumkarbonat`, `E170` | Tilsetning |
| LACTIC_ACID | `melkesyre` (uten "bakterier/kultur") | Industrielt fremstilt |

### Utvidet HIGH_RISK_CATEGORIES

Legg til: `nuggets`, `fiskepinner`, `fiskegrateng`, `grandiosa`, `pølsebrød`, `ketchup`, `majones`, `dressing`

### Filer som endres

1. `src/lib/novaClassifier.ts` — legg til nye regler, bump versjon til 1.2.0
2. `supabase/functions/_shared/novaClassifier.ts` — identiske endringer
3. `src/lib/novaClassifier.test.ts` — nye testcases for alle nye regler

### Viktige hensyn

- `stivelse` som svak regel må bruke negativ lookahead for å unngå treff på "modifisert stivelse" (allerede dekket som sterk)
- `sirup` som sterk regel må bruke negativ lookbehind for å unngå dobbelttreff med eksisterende "glukose-sirup"-regel
- `melkesyre` som svak regel må ekskludere "melkesyrebakterier" og "melkesyrekultur" (naturlige prosesser)
- Gelatin-regelen bør ekskludere "bladgelatin" som er mer tradisjonelt, men begge er industrielle — behold som sterk

