
# Snarvei til profiloppsett for nye brukere

## Problemet
Nye brukere som registrerer seg ser Dashboard-siden uten noen indikasjon på at de bør sette opp profilen sin (allergier, dietter, preferanser). Profilpreferansene er viktige for at appen skal gi riktige produktanbefalinger.

## Losningen
Legge til en synlig banner/kort pa Dashboard-siden som vises nar brukeren ikke har satt opp profilen sin enna. Banneret vil ha en tydelig knapp som tar brukeren direkte til `/profile`.

## Teknisk plan

### 1. Sjekk profilstatus i Dashboard
- Bruk `useProfile`-hooken som allerede finnes for a hente brukerens profil
- Sjekk om `profile?.preferences` er tom/mangler

### 2. Vis profilbanner
- Legg til et fremhevet kort rett under overskriften "Mine handlelister" (for knappene "Ny liste" og "Oppskrifter")
- Banneret vises kun nar preferanser ikke er satt opp
- Inneholder en kort beskrivelse og en "Sett opp profil"-knapp som navigerer til `/profile`
- Banneret kan avvises med et X-ikon (valgfritt - men brukeren kan alltid na profilen via menyen)

### 3. Filer som endres
- `src/pages/Dashboard.tsx` - Importere `useProfile`, legge til profilsjekk og banner-komponent
