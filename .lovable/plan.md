

## Kompakt handlemodus for ShoppingMode

### Problem
Hver vare i handlemodus tar mye vertikal plass (søketekst, NOVA-advarsler, stort produktkort med merke/pris/badges, alternativer-knapp, DIY-forslag). Pa en 390px-bred mobil far brukeren kanskje bare 1-2 varer synlig om gangen.

### Losning
Legg til en "kompakt visning"-toggle i headeren. Nar kompakt modus er aktiv, vises hver vare som en enkel rad med:
- Avkryssingsboks (44px touch target)
- Produktbilde (40x40)
- Produktnavn (truncated, 1 linje)
- Pris

Alt annet skjules: soketekst, NOVA-badges, advarsler, preferanseindikatorer, alternativer-knapp, DIY-forslag. Brukeren kan trykke pa en vare for a ga til produktdetaljer om de trenger mer info.

### Teknisk plan

**1. Legg til kompakt-toggle state i ShoppingMode.tsx**
- Ny `const [compactView, setCompactView] = useState(false)` state
- Toggle-knapp i sticky header (ikon: `List`/`LayoutList` fra lucide)
- Lagre preferansen i localStorage sa den huskes

**2. Betinget rendering av varekort (ShoppingMode.tsx, linje ~914-1163)**
- Nar `compactView === true`, rendrer en forenklet rad i stedet for det fulle produktkortet:

```text
┌──────────────────────────────────────┐
│ [✓]  [img]  Kolonihagen Kokt sk.. 42kr │
└──────────────────────────────────────┘
```

- Raden er ~48-56px hoy (vs ~150-200px i fullvisning)
- Checkbox + bilde + navn (truncate) + pris, alt pa en linje
- Klikk pa raden gar til produktdetaljer
- Avkryssede varer far `line-through` og dempet farge
- Ingen NOVA-badge, ingen advarsler, ingen alternativer, ingen DIY

**3. Kategoriheadere forblir synlige**
- Emoji + kategorinavn beholdes for navigering i butikken
- Gjor dem litt mer kompakte (mindre padding)

**4. Footer/totalsum forblir uendret**

### Filer som endres
- `src/components/ShoppingMode.tsx` — toggle state, header-knapp, kompakt rad-rendering

