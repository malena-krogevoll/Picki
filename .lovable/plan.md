

## Plan: Bedre sesjonspersistens for PWA

### Problemet
AuthProvider setter bare `loading=false` ved `SIGNED_IN` og `SIGNED_OUT`-events. Når appen våkner fra dvale (mobil/desktop PWA), trigges ofte `TOKEN_REFRESHED` i stedet — som aldri setter `loading=false`. Resultatet er en evig spinner eller redirect til login.

### Endringer

**1. Fiks AuthProvider (`src/components/AuthProvider.tsx`)**
- Sett `loading=false` for *alle* auth-events, ikke bare SIGNED_IN/SIGNED_OUT
- Legg til `visibilitychange`-listener som kaller `supabase.auth.getSession()` når appen våkner fra bakgrunn — dette trigger token-refresh hvis nødvendig
- Håndter `TOKEN_REFRESHED`-event eksplisitt

**2. Oppdater Supabase-klient (`src/integrations/supabase/client.ts`)**
- Legg til `detectSessionInUrl: true` for å fange opp OAuth/recovery-tokens fra URL
- Legg til `flowType: 'pkce'` for sikrere token-håndtering

**3. Fjern duplikat useAuth-hook (`src/hooks/useAuth.tsx`)**
- Denne filen dupliserer AuthProvider-logikken og kan skape forvirring — slettes

### Teknisk detalj
Hovedårsaken er linje 35-37 i AuthProvider: `if (event === 'SIGNED_IN' || event === 'SIGNED_OUT')` filtrerer bort `TOKEN_REFRESHED` og `INITIAL_SESSION`, som begge er kritiske for PWA-gjenoppvåkning. Visibility-listeneren sikrer at token refreshes proaktivt når brukeren åpner appen igjen.

