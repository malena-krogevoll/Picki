/**
 * Pure scoring and filtering functions extracted from the search-products edge function.
 * These functions determine how products are ranked, filtered, and matched
 * against user queries and preferences.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Product {
  EAN?: number;
  Produktnavn?: string;
  Pris?: string;
  Kjede?: string;
  StoreCode?: string;
  Kategori?: string;
  Merke?: string;
  "Allergener/Kosthold"?: string;
  Tilleggsfiltre?: string;
  Produktbilde_URL?: string;
  Ingrediensliste?: string;
  Region?: string;
  Tilgjengelighet?: string;
}

export interface ProductCandidate {
  product: Product;
  score: number;
  priceNumeric: number;
  renvareScore: number;
  availability: string;
  matchReason: string;
}

export interface ItemIntent {
  original: string;
  primaryProduct: string;
  productCategory: string;
  alternativeTerms: string[];
  excludePatterns: string[];
  isGenericTerm: boolean;
}

export interface UserPreferences {
  allergies?: string[];
  diets?: string[];
  renvare_only?: boolean;
  priority_order?: string[];
  other_preferences?: Record<string, unknown>;
}

// ── Excluded categories (non-food) ─────────────────────────────────────────

export const excludedCategories = [
  "husholdning", "rengjøring", "personlig pleie", "hygiene",
  "dyremat", "hundemat", "kattemat", "vaskemiddel", "oppvask",
  "toalettpapir", "bleier", "sjampo", "såpe", "tannkrem",
  "deodorant", "batterier", "lys", "plastposer",
];

// ── Synonym mapping ────────────────────────────────────────────────────────

export const searchSynonyms: Record<string, string[]> = {
  "helmelk": ["helmjølk", "h-melk", "hel melk", "helmelk 3,5%"],
  "helmjølk": ["helmelk", "h-melk", "hel melk"],
  "lettmelk": ["lettmjølk", "lett melk", "l-melk", "lettmelk 1,2%"],
  "melk": ["mjølk", "melk"],
  "mjølk": ["melk", "mjølk"],
  "smør": ["meierismør", "butter", "smør", "bremykt"],
  "ost": ["gulost", "cheese", "norvegia", "jarlsberg", "synnøve"],
  "yoghurt": ["yogurt", "gresk yoghurt", "skyr", "yoplait", "activia"],
  "brød": ["braud", "grovbrød", "loff", "kneip", "frokostbrød", "rundstykker"],
  "kjøttdeig": ["kjøtdeig", "deig", "karbonadedeig"],
  "kylling": ["kyllingfilet", "kyllingbryst", "chicken", "høns"],
  "poteter": ["potet", "potato", "mandelpoteter", "nypoteter"],
  "potet": ["poteter", "potato"],
  "tomat": ["tomater", "cherry tomat", "hermetisk tomat"],
  "potetgull": ["chips", "maarud", "kims", "sørlandschips", "potetgull salt"],
  "chips": ["potetgull", "maarud", "kims", "sørlandschips", "tortillachips"],
  "pasta": ["spaghetti", "penne", "makaroni", "fusilli", "tagliatelle", "linguine"],
  "egg": ["frittgående egg", "økologiske egg", "egg", "prior"],
  "kremost": ["snøfrisk", "philadelphia", "philadelphia original", "creme bonjour", "buko", "ferskost", "smøreost"],
  "peanøttsmør": ["peanut butter", "skippy", "nøttepålegg", "peanøttpålegg", "peanøtt"],
};

// ── Pure functions ─────────────────────────────────────────────────────────

/**
 * Expand a search query with Norwegian food synonyms and variants.
 * Returns max 2 queries to avoid API rate-limiting.
 */
export function expandSearchQuery(query: string): string[] {
  const queryLower = query.toLowerCase().trim();
  const expandedQueries = [query];

  // Exact match in synonym map
  if (searchSynonyms[queryLower]) {
    for (const synonym of searchSynonyms[queryLower]) {
      if (!expandedQueries.map(q => q.toLowerCase()).includes(synonym.toLowerCase())) {
        expandedQueries.push(synonym);
      }
    }
  }

  // Partial match: query contains a synonym key
  for (const [key, synonyms] of Object.entries(searchSynonyms)) {
    if (queryLower.includes(key) && queryLower !== key) {
      for (const synonym of synonyms.slice(0, 2)) {
        const expandedQuery = query.toLowerCase().replace(key, synonym);
        if (!expandedQueries.map(q => q.toLowerCase()).includes(expandedQuery)) {
          expandedQueries.push(expandedQuery);
        }
      }
    }
  }

  return expandedQueries.slice(0, 2);
}

/**
 * Filter out products that belong to non-food categories.
 */
export function filterOutNonFoodProducts(products: Product[]): Product[] {
  return products.filter(product => {
    const category = (product.Kategori || "").toLowerCase();
    const name = (product.Produktnavn || "").toLowerCase();

    for (const excluded of excludedCategories) {
      if (category.includes(excluded) || name.includes(excluded)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate a "renvare" (clean food) score from 0–100.
 * Starts at 100, deducts 15 per harmful additive, adds 20 for "renvare" label.
 */
export function calculateRenvareScore(ingredients: string, filters: string): number {
  let score = 100;

  const harmful = [
    "konserveringsmiddel", "farge", "aroma", "stabilisator",
    "emulgator", "antioksidant", "sødestoff", "forsterkningsstoff",
  ];

  const ingredientsLower = ingredients.toLowerCase();
  const filtersLower = filters.toLowerCase();

  for (const term of harmful) {
    if (ingredientsLower.includes(term)) {
      score -= 15;
    }
  }

  if (filtersLower.includes("renvare")) {
    score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Parse a price string like "49,90 kr" into a numeric value.
 */
export function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^\d,.-]/g, "").replace(",", ".");
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

/**
 * Generate a human-readable match reason for basic search.
 */
export function getMatchReason(productName: string, query: string, score: number): string {
  const queryLower = query.toLowerCase();
  const nameLower = productName.toLowerCase();

  if (nameLower === queryLower) return "Eksakt treff";
  if (nameLower.includes(queryLower)) return "Delvis treff i produktnavn";
  if (score > 50) return "God match";
  if (score > 20) return "Mulig match";
  return "Svak match";
}

/**
 * Generate a human-readable match reason for intent-based search.
 */
export function getIntentMatchReason(_productName: string, _intent: ItemIntent, score: number): string {
  if (score < 0) return "Ekskludert (ikke relevant)";
  if (score >= 130) return "Perfekt match";
  if (score >= 100) return "God kategori- og produktmatch";
  if (score >= 50) return "Kategori match";
  if (score > 0) return "Mulig match";
  return "Svak match";
}

/**
 * Check whether a product category matches an intent category.
 */
export function matchesCategory(productCategory: string, intentCategory: string): boolean {
  const categoryMap: Record<string, string[]> = {
    "meieri": ["meieri", "melk", "ost", "yoghurt", "fløte", "smør"],
    "grønnsaker": ["grønnsaker", "frukt og grønt", "frukt", "grønt"],
    "frukt": ["frukt", "frukt og grønt", "bær"],
    "kjøtt": ["kjøtt", "ferskvarer", "pålegg", "kjøttvarer"],
    "fisk": ["fisk", "sjømat", "ferskvarer"],
    "bakervarer": ["bakervarer", "brød", "bakeriet", "ferske bakervarer"],
    "snacks": ["snacks", "chips", "godteri", "konfekt", "søtsaker"],
    "frysemat": ["frysevarer", "frysemat", "is", "frossen"],
    "drikkevarer": ["drikkevarer", "drikke", "brus", "juice", "kaffe", "te"],
    "basisvarer": ["tørrmat", "basisvarer", "mel", "sukker", "pasta", "ris"],
    "egg": ["egg", "meieri", "frokost"],
  };

  const intentLower = intentCategory.toLowerCase();
  const allowedCategories = categoryMap[intentLower] || [intentLower];

  return allowedCategories.some(cat => productCategory.includes(cat));
}

/**
 * Score a product against a plain-text query (no intent).
 * This is the core text-matching algorithm used when AI intent is unavailable.
 */
export function processProduct(product: Product, query: string, userPreferences?: UserPreferences): ProductCandidate {
  const productName = product.Produktnavn || "";
  const allergies = product["Allergener/Kosthold"] || "";
  const ingredients = product.Ingrediensliste || "";
  const filters = product.Tilleggsfiltre || "";
  const price = product.Pris || "0";
  const category = product.Kategori || "";

  let score = 0;
  const queryLower = query.toLowerCase().trim();
  const nameLower = productName.toLowerCase();
  const categoryLower = category.toLowerCase();

  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const nameTokens = nameLower.split(/[\s\-\/\(\)]+/).filter(w => w.length > 0);
  const nameWords = nameLower.split(/\s+/);

  const allQueryWordsFound = queryWords.every(qw =>
    nameTokens.some(nt => nt === qw || nt.includes(qw) || qw.includes(nt))
  );

  const exactTokenMatches = queryWords.filter(qw => nameTokens.includes(qw)).length;

  if (nameLower === queryLower) {
    score += 100;
  } else if (nameWords.includes(queryLower) || categoryLower === queryLower) {
    score += 90;
  } else if (nameLower.startsWith(queryLower + " ") || nameLower.startsWith(queryLower + ",")) {
    score += 85;
  } else if (allQueryWordsFound && queryWords.length > 1) {
    const exactRatio = exactTokenMatches / queryWords.length;
    score += 70 + (exactRatio * 15);
  } else if (nameTokens.some(token => token === queryLower)) {
    score += 75;
  } else if (nameLower.includes(queryLower)) {
    const isCompoundWord = nameWords.some(word =>
      word.includes(queryLower) && word !== queryLower && word.length > queryLower.length + 2
    );
    score += isCompoundWord ? 30 : 70;
  } else {
    const tokenMatches = queryWords.filter(word =>
      nameTokens.some(token => token === word || token.startsWith(word) || token.includes(word)),
    );
    score += (tokenMatches.length / queryWords.length) * 50;
  }

  if (userPreferences) {
    score = applyUserPreferences(score, userPreferences, allergies, ingredients, filters, productName);
  }

  const renvareScore = calculateRenvareScore(ingredients, filters);
  const priceNumeric = parsePrice(price);
  const availability = product.Tilgjengelighet || "unknown";

  return {
    product,
    score,
    priceNumeric,
    renvareScore,
    availability,
    matchReason: getMatchReason(productName, query, score),
  };
}

/**
 * Score a product against an AI-generated intent (semantic search).
 * This provides category awareness and exclusion-pattern penalties.
 */
export function processProductWithIntent(
  product: Product,
  query: string,
  intent: ItemIntent,
  userPreferences?: UserPreferences
): ProductCandidate {
  const productName = product.Produktnavn || "";
  const allergies = product["Allergener/Kosthold"] || "";
  const ingredients = product.Ingrediensliste || "";
  const filters = product.Tilleggsfiltre || "";
  const price = product.Pris || "0";
  const category = product.Kategori || "";

  let score = 0;
  const nameLower = productName.toLowerCase();
  const categoryLower = category.toLowerCase();

  // 1. Category match (50 points)
  if (matchesCategory(categoryLower, intent.productCategory)) {
    score += 50;
  }

  // 2. Exclude patterns – heavy penalty (-100 per match)
  for (const pattern of intent.excludePatterns) {
    if (nameLower.includes(pattern.toLowerCase())) {
      score -= 100;
    }
  }

  // 2b. Compound-word penalty
  const queryLower = query.toLowerCase().trim();
  const nameWords = nameLower.split(/[\s\-\/\(\),]+/).filter(w => w.length > 0);
  const isCompoundMatch = nameWords.some(word => {
    if (word.includes(queryLower) && word.length > queryLower.length + 2) {
      const suffixStart = word.indexOf(queryLower) + queryLower.length;
      const suffix = word.substring(suffixStart);
      return suffix.length >= 3;
    }
    return false;
  });

  if (isCompoundMatch && score > 0) {
    score -= 80;
  }

  // 3. Primary product match (80 points)
  const primaryLower = intent.primaryProduct.toLowerCase();
  if (nameLower.includes(primaryLower) || primaryLower.includes(nameLower.split(' ')[0])) {
    score += 80;
  }

  // 4. Alternative terms match (30 points, max once)
  for (const alt of intent.alternativeTerms) {
    if (nameLower.includes(alt.toLowerCase())) {
      score += 30;
      break;
    }
  }

  // 5. Original query match (not compound)
  if (nameLower.includes(queryLower) && !isCompoundMatch) {
    score += 20;
  }

  // 6. Generic term – boost shorter names
  if (intent.isGenericTerm) {
    const wordCount = nameLower.split(' ').length;
    if (wordCount <= 3) score += 10;
  }

  // 7. User preferences
  if (userPreferences) {
    score = applyUserPreferencesIntent(score, userPreferences, allergies, ingredients, filters, productName);
  }

  const renvareScore = calculateRenvareScore(ingredients, filters);
  const priceNumeric = parsePrice(price);
  const availability = product.Tilgjengelighet || "unknown";

  return {
    product,
    score,
    priceNumeric,
    renvareScore,
    availability,
    matchReason: getIntentMatchReason(productName, intent, score),
  };
}

/**
 * NOVA-aware sort: products are sorted by allergen safety, NOVA score,
 * renvare score, and finally text-match score.
 */
export function sortCandidatesWithNova(
  candidates: ProductCandidate[],
  novaMap: Map<string, number>
): ProductCandidate[] {
  return [...candidates].sort((a, b) => {
    const aEan = a.product.EAN ? String(a.product.EAN) : "";
    const bEan = b.product.EAN ? String(b.product.EAN) : "";
    const aNova = novaMap.get(aEan) ?? 99;
    const bNova = novaMap.get(bEan) ?? 99;

    // 1. Both relevant? NOVA difference >= 2 trumps text score
    const bothRelevant = a.score >= 50 && b.score >= 50;
    if (bothRelevant && aNova !== bNova) {
      if (Math.abs(aNova - bNova) >= 2) return aNova - bNova;
    }

    // 2. renvareScore difference > 20 is significant
    const renvareDiff = b.renvareScore - a.renvareScore;
    if (Math.abs(renvareDiff) > 20) return renvareDiff;

    // 3. Smaller NOVA difference still matters if both relevant
    if (bothRelevant && aNova !== bNova) return aNova - bNova;

    // 4. Fall back to text-match score
    return b.score - a.score;
  });
}

// ── Internal helpers ───────────────────────────────────────────────────────

function applyUserPreferences(
  score: number,
  prefs: UserPreferences,
  allergies: string,
  ingredients: string,
  filters: string,
  productName: string
): number {
  for (const allergy of prefs.allergies || []) {
    if (
      allergies.toLowerCase().includes(allergy.toLowerCase()) ||
      ingredients.toLowerCase().includes(allergy.toLowerCase())
    ) {
      return 0;
    }
  }

  for (const diet of prefs.diets || []) {
    if (diet === "vegetarian" && (ingredients.toLowerCase().includes("kjøtt") || ingredients.toLowerCase().includes("fisk"))) {
      score *= 0.1;
    }
    if (diet === "vegan" && (ingredients.toLowerCase().includes("melk") || ingredients.toLowerCase().includes("egg") || ingredients.toLowerCase().includes("kjøtt") || ingredients.toLowerCase().includes("fisk"))) {
      score *= 0.1;
    }
  }

  if (prefs.renvare_only) {
    const isRenvare = filters.toLowerCase().includes("renvare") || productName.toLowerCase().includes("renvare");
    if (!isRenvare) {
      score *= 0.3;
    }
  }

  return score;
}

function applyUserPreferencesIntent(
  score: number,
  prefs: UserPreferences,
  allergies: string,
  ingredients: string,
  filters: string,
  productName: string
): number {
  for (const allergy of prefs.allergies || []) {
    if (
      allergies.toLowerCase().includes(allergy.toLowerCase()) ||
      ingredients.toLowerCase().includes(allergy.toLowerCase())
    ) {
      return Math.min(score, 0);
    }
  }

  for (const diet of prefs.diets || []) {
    if (diet === "vegetarian" && (ingredients.toLowerCase().includes("kjøtt") || ingredients.toLowerCase().includes("fisk"))) {
      score *= 0.1;
    }
    if (diet === "vegan" && (ingredients.toLowerCase().includes("melk") || ingredients.toLowerCase().includes("egg") || ingredients.toLowerCase().includes("kjøtt") || ingredients.toLowerCase().includes("fisk"))) {
      score *= 0.1;
    }
  }

  if (prefs.renvare_only) {
    const isRenvare = filters.toLowerCase().includes("renvare") || productName.toLowerCase().includes("renvare");
    if (!isRenvare) {
      score *= 0.3;
    }
  }

  return score;
}
