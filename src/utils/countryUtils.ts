// ISO 3166-1 numeric/alpha-2 country codes → flag emoji + Norwegian name

const COUNTRY_DATA: Record<string, { flag: string; name: string }> = {
  // Numeric codes (GS1/EPD uses these)
  "578": { flag: "🇳🇴", name: "Norge" },
  "752": { flag: "🇸🇪", name: "Sverige" },
  "208": { flag: "🇩🇰", name: "Danmark" },
  "246": { flag: "🇫🇮", name: "Finland" },
  "352": { flag: "🇮🇸", name: "Island" },
  "276": { flag: "🇩🇪", name: "Tyskland" },
  "528": { flag: "🇳🇱", name: "Nederland" },
  "056": { flag: "🇧🇪", name: "Belgia" },
  "250": { flag: "🇫🇷", name: "Frankrike" },
  "380": { flag: "🇮🇹", name: "Italia" },
  "724": { flag: "🇪🇸", name: "Spania" },
  "620": { flag: "🇵🇹", name: "Portugal" },
  "826": { flag: "🇬🇧", name: "Storbritannia" },
  "372": { flag: "🇮🇪", name: "Irland" },
  "756": { flag: "🇨🇭", name: "Sveits" },
  "040": { flag: "🇦🇹", name: "Østerrike" },
  "616": { flag: "🇵🇱", name: "Polen" },
  "203": { flag: "🇨🇿", name: "Tsjekkia" },
  "300": { flag: "🇬🇷", name: "Hellas" },
  "792": { flag: "🇹🇷", name: "Tyrkia" },
  "840": { flag: "🇺🇸", name: "USA" },
  "124": { flag: "🇨🇦", name: "Canada" },
  "076": { flag: "🇧🇷", name: "Brasil" },
  "032": { flag: "🇦🇷", name: "Argentina" },
  "152": { flag: "🇨🇱", name: "Chile" },
  "156": { flag: "🇨🇳", name: "Kina" },
  "392": { flag: "🇯🇵", name: "Japan" },
  "410": { flag: "🇰🇷", name: "Sør-Korea" },
  "764": { flag: "🇹🇭", name: "Thailand" },
  "704": { flag: "🇻🇳", name: "Vietnam" },
  "360": { flag: "🇮🇩", name: "Indonesia" },
  "356": { flag: "🇮🇳", name: "India" },
  "036": { flag: "🇦🇺", name: "Australia" },
  "554": { flag: "🇳🇿", name: "New Zealand" },
  "710": { flag: "🇿🇦", name: "Sør-Afrika" },
  "818": { flag: "🇪🇬", name: "Egypt" },
  "504": { flag: "🇲🇦", name: "Marokko" },
  "442": { flag: "🇱🇺", name: "Luxembourg" },
  "348": { flag: "🇭🇺", name: "Ungarn" },
  "642": { flag: "🇷🇴", name: "Romania" },
  "100": { flag: "🇧🇬", name: "Bulgaria" },
  "191": { flag: "🇭🇷", name: "Kroatia" },
  "233": { flag: "🇪🇪", name: "Estland" },
  "428": { flag: "🇱🇻", name: "Latvia" },
  "440": { flag: "🇱🇹", name: "Litauen" },
  // Alpha-2 codes (fallback)
  "NO": { flag: "🇳🇴", name: "Norge" },
  "SE": { flag: "🇸🇪", name: "Sverige" },
  "DK": { flag: "🇩🇰", name: "Danmark" },
  "FI": { flag: "🇫🇮", name: "Finland" },
  "IS": { flag: "🇮🇸", name: "Island" },
  "DE": { flag: "🇩🇪", name: "Tyskland" },
  "NL": { flag: "🇳🇱", name: "Nederland" },
  "BE": { flag: "🇧🇪", name: "Belgia" },
  "FR": { flag: "🇫🇷", name: "Frankrike" },
  "IT": { flag: "🇮🇹", name: "Italia" },
  "ES": { flag: "🇪🇸", name: "Spania" },
  "PT": { flag: "🇵🇹", name: "Portugal" },
  "GB": { flag: "🇬🇧", name: "Storbritannia" },
  "IE": { flag: "🇮🇪", name: "Irland" },
  "CH": { flag: "🇨🇭", name: "Sveits" },
  "AT": { flag: "🇦🇹", name: "Østerrike" },
  "PL": { flag: "🇵🇱", name: "Polen" },
  "CZ": { flag: "🇨🇿", name: "Tsjekkia" },
  "GR": { flag: "🇬🇷", name: "Hellas" },
  "TR": { flag: "🇹🇷", name: "Tyrkia" },
  "US": { flag: "🇺🇸", name: "USA" },
  "CA": { flag: "🇨🇦", name: "Canada" },
  "BR": { flag: "🇧🇷", name: "Brasil" },
  "AR": { flag: "🇦🇷", name: "Argentina" },
  "CL": { flag: "🇨🇱", name: "Chile" },
  "CN": { flag: "🇨🇳", name: "Kina" },
  "JP": { flag: "🇯🇵", name: "Japan" },
  "KR": { flag: "🇰🇷", name: "Sør-Korea" },
  "TH": { flag: "🇹🇭", name: "Thailand" },
  "VN": { flag: "🇻🇳", name: "Vietnam" },
  "ID": { flag: "🇮🇩", name: "Indonesia" },
  "IN": { flag: "🇮🇳", name: "India" },
  "AU": { flag: "🇦🇺", name: "Australia" },
  "NZ": { flag: "🇳🇿", name: "New Zealand" },
  "ZA": { flag: "🇿🇦", name: "Sør-Afrika" },
  "EG": { flag: "🇪🇬", name: "Egypt" },
  "MA": { flag: "🇲🇦", name: "Marokko" },
  "LU": { flag: "🇱🇺", name: "Luxembourg" },
  "HU": { flag: "🇭🇺", name: "Ungarn" },
  "RO": { flag: "🇷🇴", name: "Romania" },
  "BG": { flag: "🇧🇬", name: "Bulgaria" },
  "HR": { flag: "🇭🇷", name: "Kroatia" },
  "EE": { flag: "🇪🇪", name: "Estland" },
  "LV": { flag: "🇱🇻", name: "Latvia" },
  "LT": { flag: "🇱🇹", name: "Litauen" },
};

export interface CountryInfo {
  code: string;
  flag: string;
  name: string;
  alpha2: string; // ISO 3166-1 alpha-2 code for flag image rendering
}

/**
 * Look up country info from a code (numeric or alpha-2).
 */
export function getCountryInfo(code: string): CountryInfo | null {
  const normalized = code.trim().toUpperCase();
  const data = COUNTRY_DATA[normalized];
  if (!data) return null;
  // Derive alpha2: if normalized is already 2 chars, use it; otherwise map from numeric
  const alpha2 = normalized.length === 2 ? normalized : (NUMERIC_TO_ALPHA2[normalized] || normalized);
  return { code: normalized, alpha2, ...data };
}

// GS1 EAN barcode prefix → country (first 3 digits of EAN)
// See https://www.gs1.org/standards/id-keys/company-prefix
const GS1_PREFIX_MAP: [number, number, string, string][] = [
  // [rangeStart, rangeEnd, flag, name]
  [700, 709, "🇳🇴", "Norge"],
  [730, 739, "🇸🇪", "Sverige"],
  [570, 579, "🇩🇰", "Danmark"],
  [640, 649, "🇫🇮", "Finland"],
  [400, 440, "🇩🇪", "Tyskland"],
  [870, 879, "🇳🇱", "Nederland"],
  [540, 549, "🇧🇪", "Belgia"],
  [300, 379, "🇫🇷", "Frankrike"],
  [800, 839, "🇮🇹", "Italia"],
  [840, 849, "🇪🇸", "Spania"],
  [560, 569, "🇵🇹", "Portugal"],
  [500, 509, "🇬🇧", "Storbritannia"],
  [539, 539, "🇮🇪", "Irland"],
  [760, 769, "🇨🇭", "Sveits"],
  [900, 919, "🇦🇹", "Østerrike"],
  [590, 590, "🇵🇱", "Polen"],
  [859, 859, "🇨🇿", "Tsjekkia"],
  [520, 521, "🇬🇷", "Hellas"],
  [868, 869, "🇹🇷", "Tyrkia"],
  [0, 19, "🇺🇸", "USA"],
  [750, 759, "🇲🇽", "Mexico"],
  [789, 790, "🇧🇷", "Brasil"],
  [779, 779, "🇦🇷", "Argentina"],
  [690, 699, "🇨🇳", "Kina"],
  [450, 459, "🇯🇵", "Japan"],
  [880, 880, "🇰🇷", "Sør-Korea"],
  [885, 885, "🇹🇭", "Thailand"],
  [893, 893, "🇻🇳", "Vietnam"],
  [884, 884, "🇰🇭", "Kambodsja"],
  [890, 890, "🇮🇳", "India"],
  [930, 939, "🇦🇺", "Australia"],
  [940, 949, "🇳🇿", "New Zealand"],
  [600, 601, "🇿🇦", "Sør-Afrika"],
];

/**
 * Detect country from EAN barcode prefix (GS1 company prefix).
 * Returns country info based on where the barcode was registered.
 */
export function getCountryFromEAN(ean: string): CountryInfo | null {
  if (!ean || ean.length < 3) return null;
  const prefix = parseInt(ean.substring(0, 3), 10);
  if (isNaN(prefix)) return null;

  for (const [start, end, flag, name] of GS1_PREFIX_MAP) {
    if (prefix >= start && prefix <= end) {
      return { code: `GS1:${prefix}`, flag, name };
    }
  }
  return null;
}

/**
 * Generate flag emoji from alpha-2 country code using regional indicator symbols.
 * Works for any valid ISO 3166-1 alpha-2 code.
 */
export function countryCodeToFlag(alpha2: string): string {
  const code = alpha2.toUpperCase();
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    ...([...code].map(c => 0x1f1e5 + c.charCodeAt(0) - 64))
  );
}

/**
 * Extract country of origin from an EPD/VDA+ payload.
 * Handles multiple possible GS1 field structures.
 */
export function extractCountryOfOrigin(payload: Record<string, unknown>): CountryInfo[] {
  const results: CountryInfo[] = [];
  const seen = new Set<string>();

  const addCode = (code: unknown) => {
    if (typeof code !== "string" && typeof code !== "number") return;
    const str = String(code).trim();
    if (!str || seen.has(str)) return;
    seen.add(str);
    const info = getCountryInfo(str);
    if (info) {
      results.push(info);
    } else if (str.length === 2) {
      // Try generating flag from alpha-2 even if not in our map
      const flag = countryCodeToFlag(str);
      if (flag) results.push({ code: str, flag, name: str });
    }
  };

  // GS1 standard: placeOfProductActivity.countryOfOrigin
  const place = payload.placeOfProductActivity as any;
  if (place) {
    if (Array.isArray(place)) {
      place.forEach((p: any) => {
        addCode(p?.countryOfOrigin?.countryCode);
        addCode(p?.countryOfOrigin);
        addCode(p?.countryCode);
      });
    } else {
      addCode(place?.countryOfOrigin?.countryCode);
      addCode(place?.countryOfOrigin);
      addCode(place?.countryCode);
    }
  }

  // Direct field variants
  addCode(payload.countryOfOrigin);
  addCode(payload.country_of_origin);
  addCode(payload.countryOfOriginCode);
  addCode(payload.originCountry);
  
  // Nested countryOfOrigin array
  const coo = payload.countryOfOrigin;
  if (Array.isArray(coo)) {
    coo.forEach((c: any) => {
      addCode(c?.countryCode);
      addCode(c);
    });
  }

  // placeOfItemActivityInformation (another GS1 variant)
  const placeInfo = payload.placeOfItemActivityInformation as any;
  if (placeInfo) {
    const items = Array.isArray(placeInfo) ? placeInfo : [placeInfo];
    items.forEach((item: any) => {
      addCode(item?.countryOfOrigin?.countryISOCode);
      addCode(item?.countryOfOriginStatement);
    });
  }

  return results;
}
