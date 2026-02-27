

## Plan: Gjør Picki til en fullverdig PWA

### Hva dette innebærer
Appen blir installerbar fra nettleseren til hjemskjermen på mobil og desktop. Den vil fungere offline (cached shell), laste raskt, og oppføre seg som en native app med splash screen og riktig ikon.

### Implementeringssteg

1. **Installer `vite-plugin-pwa`** som dev-dependency

2. **Konfigurer `vite.config.ts`** med VitePWA-plugin:
   - App-navn: "Picki", kort navn: "Picki"
   - Theme-farge og bakgrunnsfarge som matcher appen
   - `display: "standalone"` for native-følelse
   - Ikoner basert på `favicon.png` (192x192 og 512x512)
   - `navigateFallbackDenylist: [/^\/~oauth/]` for å unngå caching av OAuth-ruter
   - `registerType: 'autoUpdate'` for automatisk oppdatering av service worker

3. **Oppdater `index.html`** med PWA-meta-tags:
   - `<meta name="theme-color">` 
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-status-bar-style">`
   - Oppdater description og OG-tags til Picki-branding

4. **Generere PWA-ikoner** i `public/`:
   - `pwa-192x192.png` og `pwa-512x512.png` (kan bruke favicon.png som kilde)
   - Maskable icon-variant

5. **Registrer service worker** i `src/main.tsx` ved å importere `registerSW` fra `virtual:pwa-register`

### Tekniske detaljer
- Bruker `vite-plugin-pwa` som genererer manifest.webmanifest og service worker automatisk
- Workbox precacher app-shell (HTML, CSS, JS) for offline-støtte
- Runtime-caching for API-kall kan legges til senere ved behov

