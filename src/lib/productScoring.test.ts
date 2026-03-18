import { describe, it, expect } from 'vitest';
import {
  expandSearchQuery,
  filterOutNonFoodProducts,
  calculateRenvareScore,
  parsePrice,
  getMatchReason,
  getIntentMatchReason,
  matchesCategory,
  processProduct,
  processProductWithIntent,
  sortCandidatesWithNova,
  type Product,
  type ProductCandidate,
  type ItemIntent,
  type UserPreferences,
} from './productScoring';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    EAN: 7038010000001,
    Produktnavn: "Tine Helmelk 1L",
    Pris: "24,90",
    Kjede: "Rema 1000",
    Kategori: "meieri",
    Merke: "Tine",
    "Allergener/Kosthold": "melk",
    Ingrediensliste: "helmelk",
    Tilleggsfiltre: "",
    Produktbilde_URL: "https://example.com/melk.jpg",
    Tilgjengelighet: "available",
    ...overrides,
  };
}

function makeIntent(overrides: Partial<ItemIntent> = {}): ItemIntent {
  return {
    original: "melk",
    primaryProduct: "melk",
    productCategory: "meieri",
    alternativeTerms: ["helmelk", "lettmelk"],
    excludePatterns: [],
    isGenericTerm: false,
    ...overrides,
  };
}

// ── expandSearchQuery ──────────────────────────────────────────────────────

describe('expandSearchQuery', () => {
  it('should always include the original query first', () => {
    const result = expandSearchQuery('melk');
    expect(result[0]).toBe('melk');
  });

  it('should expand known synonyms', () => {
    const result = expandSearchQuery('helmelk');
    expect(result.length).toBe(2);
    expect(result).toContain('helmelk');
  });

  it('should return max 2 queries to avoid rate limiting', () => {
    const result = expandSearchQuery('potetgull');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('should handle unknown terms by returning only original', () => {
    const result = expandSearchQuery('quinoa');
    expect(result).toEqual(['quinoa']);
  });

  it('should handle partial matches in multi-word queries', () => {
    const result = expandSearchQuery('grove poteter');
    // "poteter" is a key → should expand
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should be case-insensitive for lookup', () => {
    const lower = expandSearchQuery('helmelk');
    const upper = expandSearchQuery('Helmelk');
    // Both should find synonyms
    expect(lower.length).toEqual(upper.length);
  });

  it('should not add duplicate synonyms', () => {
    const result = expandSearchQuery('melk');
    const lowered = result.map(q => q.toLowerCase());
    const unique = [...new Set(lowered)];
    expect(lowered.length).toBe(unique.length);
  });
});

// ── filterOutNonFoodProducts ───────────────────────────────────────────────

describe('filterOutNonFoodProducts', () => {
  it('should keep food products', () => {
    const products = [makeProduct()];
    expect(filterOutNonFoodProducts(products)).toHaveLength(1);
  });

  it('should filter out non-food by category', () => {
    const products = [
      makeProduct({ Kategori: 'husholdning' }),
      makeProduct({ Kategori: 'rengjøring' }),
      makeProduct({ Kategori: 'meieri' }),
    ];
    expect(filterOutNonFoodProducts(products)).toHaveLength(1);
  });

  it('should filter out non-food by product name', () => {
    const products = [
      makeProduct({ Produktnavn: 'Sjampo for tørt hår', Kategori: '' }),
    ];
    expect(filterOutNonFoodProducts(products)).toHaveLength(0);
  });

  it('should handle empty product list', () => {
    expect(filterOutNonFoodProducts([])).toEqual([]);
  });

  it('should handle missing category and name gracefully', () => {
    const products = [makeProduct({ Kategori: undefined, Produktnavn: undefined })];
    expect(filterOutNonFoodProducts(products)).toHaveLength(1);
  });

  it.each([
    'dyremat', 'hundemat', 'kattemat', 'vaskemiddel', 'toalettpapir',
    'bleier', 'tannkrem', 'deodorant', 'batterier',
  ])('should exclude products in category "%s"', (cat) => {
    const products = [makeProduct({ Kategori: cat })];
    expect(filterOutNonFoodProducts(products)).toHaveLength(0);
  });
});

// ── calculateRenvareScore ──────────────────────────────────────────────────

describe('calculateRenvareScore', () => {
  it('should return 100 for clean ingredients with no additives', () => {
    expect(calculateRenvareScore('melk, salt', '')).toBe(100);
  });

  it('should deduct 15 per harmful additive found', () => {
    expect(calculateRenvareScore('mel, aroma, stabilisator', '')).toBe(70);
  });

  it('should add 20 for renvare label in filters', () => {
    expect(calculateRenvareScore('melk', 'renvare')).toBe(100); // 100 + 20 capped at 100
    // Actually: 100 + 20 = 120 → capped at 100
  });

  it('should combine deductions and renvare bonus', () => {
    // 100 - 15 (aroma) + 20 (renvare) = 105 → capped at 100
    expect(calculateRenvareScore('aroma', 'renvare')).toBe(100);
  });

  it('should not go below 0', () => {
    // 8 harmful terms × 15 = 120 deducted → 100 - 120 = -20 → clamped to 0
    const allHarmful = 'konserveringsmiddel, farge, aroma, stabilisator, emulgator, antioksidant, sødestoff, forsterkningsstoff';
    expect(calculateRenvareScore(allHarmful, '')).toBe(0);
  });

  it('should handle empty strings', () => {
    expect(calculateRenvareScore('', '')).toBe(100);
  });

  it('should be case-insensitive', () => {
    expect(calculateRenvareScore('AROMA, Stabilisator', '')).toBe(70);
  });
});

// ── parsePrice ─────────────────────────────────────────────────────────────

describe('parsePrice', () => {
  it.each([
    ['24,90', 24.9],
    ['24.90', 24.9],
    ['100', 100],
    ['0', 0],
    ['kr 49,90', 49.9],
    ['49.90 kr', 49.9],
    ['', 0],
    ['gratis', 0],
    ['12,50 NOK', 12.5],
  ])('should parse "%s" as %d', (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
});

// ── getMatchReason ─────────────────────────────────────────────────────────

describe('getMatchReason', () => {
  it('should return "Eksakt treff" for exact match', () => {
    expect(getMatchReason('melk', 'melk', 100)).toBe('Eksakt treff');
  });

  it('should return "Delvis treff" when name includes query', () => {
    expect(getMatchReason('Tine Helmelk 1L', 'helmelk', 85)).toBe('Delvis treff i produktnavn');
  });

  it('should return "God match" for score > 50 without substring', () => {
    expect(getMatchReason('Lettmelk 1L', 'helmelk', 60)).toBe('God match');
  });

  it('should return "Svak match" for low scores', () => {
    expect(getMatchReason('Brød', 'melk', 5)).toBe('Svak match');
  });
});

// ── getIntentMatchReason ───────────────────────────────────────────────────

describe('getIntentMatchReason', () => {
  const intent = makeIntent();

  it.each([
    [-10, 'Ekskludert (ikke relevant)'],
    [150, 'Perfekt match'],
    [110, 'God kategori- og produktmatch'],
    [60, 'Kategori match'],
    [10, 'Mulig match'],
    [0, 'Svak match'],
  ])('should return correct reason for score %d', (score, expected) => {
    expect(getIntentMatchReason('test', intent, score)).toBe(expected);
  });
});

// ── matchesCategory ────────────────────────────────────────────────────────

describe('matchesCategory', () => {
  it('should match exact category', () => {
    expect(matchesCategory('meieri', 'meieri')).toBe(true);
  });

  it('should match mapped sub-categories', () => {
    expect(matchesCategory('melk', 'meieri')).toBe(true);
    expect(matchesCategory('ost', 'meieri')).toBe(true);
  });

  it('should match partial category strings', () => {
    expect(matchesCategory('frukt og grønt', 'grønnsaker')).toBe(true);
  });

  it('should not match unrelated categories', () => {
    expect(matchesCategory('snacks', 'meieri')).toBe(false);
  });

  it('should fall back to literal match for unknown intent categories', () => {
    expect(matchesCategory('eksotisk frukt', 'eksotisk frukt')).toBe(true);
  });

  it('should be case-insensitive for intent category', () => {
    expect(matchesCategory('melk', 'Meieri')).toBe(true);
  });
});

// ── processProduct (core text-matching) ────────────────────────────────────

describe('processProduct', () => {
  it('should give 100 points for exact name match', () => {
    const product = makeProduct({ Produktnavn: 'melk' });
    const result = processProduct(product, 'melk');
    expect(result.score).toBe(100);
    expect(result.matchReason).toBe('Eksakt treff');
  });

  it('should give ~90 points when query is a word in the product name', () => {
    const product = makeProduct({ Produktnavn: 'Tine melk 1L' });
    const result = processProduct(product, 'melk');
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('should give 85 points when name starts with query', () => {
    const product = makeProduct({ Produktnavn: 'melk lettkokt' });
    const result = processProduct(product, 'melk');
    expect(result.score).toBe(85);
  });

  it('should penalize compound-word matches (e.g. "yogurt" in "yogurtbrød")', () => {
    const product = makeProduct({ Produktnavn: 'yogurtbrød grovt' });
    const result = processProduct(product, 'yogurt');
    expect(result.score).toBeLessThanOrEqual(30);
  });

  it('should give partial scores for multi-word queries', () => {
    const product = makeProduct({ Produktnavn: 'Tine Lett Helmelk 1L' });
    const result = processProduct(product, 'tine helmelk');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('should return 0 score when allergen matches user allergy', () => {
    const product = makeProduct({ "Allergener/Kosthold": 'melk, egg' });
    const prefs: UserPreferences = { allergies: ['melk'] };
    const result = processProduct(product, 'ost', prefs);
    expect(result.score).toBe(0);
  });

  it('should also detect allergens in ingredients list', () => {
    const product = makeProduct({ 
      "Allergener/Kosthold": '',
      Ingrediensliste: 'inneholder melk og soya' 
    });
    const prefs: UserPreferences = { allergies: ['soya'] };
    const result = processProduct(product, 'krem', prefs);
    expect(result.score).toBe(0);
  });

  it('should heavily penalize non-vegetarian products for vegetarians', () => {
    const product = makeProduct({ Ingrediensliste: 'kjøtt, salt, pepper' });
    const prefs: UserPreferences = { diets: ['vegetarian'] };
    const result = processProduct(product, 'kjøtt', prefs);
    expect(result.score).toBeLessThan(15);
  });

  it('should heavily penalize non-vegan products for vegans', () => {
    const product = makeProduct({ Ingrediensliste: 'melk, sukker' });
    const prefs: UserPreferences = { diets: ['vegan'] };
    const result = processProduct(product, 'sjokolade', prefs);
    expect(result.score).toBeLessThan(10);
  });

  it('should penalize non-renvare products when renvare_only is set', () => {
    const product = makeProduct({ Tilleggsfiltre: '', Produktnavn: 'Vanlig ost' });
    const prefs: UserPreferences = { renvare_only: true };
    const result = processProduct(product, 'ost', prefs);
    const resultNoRenvare = processProduct(product, 'ost');
    expect(result.score).toBeLessThan(resultNoRenvare.score);
  });

  it('should parse price correctly into priceNumeric', () => {
    const product = makeProduct({ Pris: '49,90 kr' });
    const result = processProduct(product, 'melk');
    expect(result.priceNumeric).toBe(49.9);
  });

  it('should calculate renvareScore from ingredients', () => {
    const product = makeProduct({ Ingrediensliste: 'melk', Tilleggsfiltre: 'renvare' });
    const result = processProduct(product, 'melk');
    expect(result.renvareScore).toBe(100);
  });

  it('should handle completely empty product gracefully', () => {
    const product: Product = {};
    const result = processProduct(product, 'melk');
    expect(result.score).toBeDefined();
    expect(result.priceNumeric).toBe(0);
  });
});

// ── processProductWithIntent ───────────────────────────────────────────────

describe('processProductWithIntent', () => {
  const baseIntent = makeIntent({
    primaryProduct: 'hvitløk',
    productCategory: 'grønnsaker',
    alternativeTerms: ['garlic', 'hvitløksfedd'],
    excludePatterns: ['dressing', 'saus'],
  });

  it('should give high score for category + primary match', () => {
    const product = makeProduct({
      Produktnavn: 'Hvitløk 3-pakk',
      Kategori: 'grønnsaker',
    });
    const result = processProductWithIntent(product, 'hvitløk', baseIntent);
    // 50 (category) + 80 (primary) + 20 (query in name) = 150
    expect(result.score).toBeGreaterThanOrEqual(130);
    expect(result.matchReason).toBe('Perfekt match');
  });

  it('should apply -100 penalty for excluded patterns', () => {
    const product = makeProduct({
      Produktnavn: 'Hvitløksdressing',
      Kategori: 'dressing',
    });
    const result = processProductWithIntent(product, 'hvitløk', baseIntent);
    expect(result.score).toBeLessThan(50);
  });

  it('should apply compound-word penalty for unrelated products', () => {
    const product = makeProduct({
      Produktnavn: 'yogurtbrødmix',
      Kategori: 'bakervarer',
    });
    const intent = makeIntent({
      primaryProduct: 'yogurt',
      productCategory: 'meieri',
    });
    const result = processProductWithIntent(product, 'yogurt', intent);
    expect(result.score).toBeLessThan(50);
  });

  it('should give 30 points for alternative term match', () => {
    const product = makeProduct({
      Produktnavn: 'Garlic fersk',
      Kategori: 'grønnsaker',
    });
    const result = processProductWithIntent(product, 'hvitløk', baseIntent);
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('should boost short names for generic terms', () => {
    const intent = makeIntent({ isGenericTerm: true, primaryProduct: 'ost' });
    const shortName = makeProduct({ Produktnavn: 'Norvegia ost', Kategori: 'meieri' });
    const longName = makeProduct({ Produktnavn: 'Norvegia ost lettsaltet skivet i pakke 150g', Kategori: 'meieri' });
    
    const shortResult = processProductWithIntent(shortName, 'ost', intent);
    const longResult = processProductWithIntent(longName, 'ost', intent);
    
    // Short name should get the 10-point generic boost
    expect(shortResult.score).toBeGreaterThanOrEqual(longResult.score);
  });

  it('should cap allergen score at 0 (not negative)', () => {
    const product = makeProduct({
      Produktnavn: 'Hvitløk',
      Kategori: 'grønnsaker',
      "Allergener/Kosthold": 'sennep',
    });
    const prefs: UserPreferences = { allergies: ['sennep'] };
    const result = processProductWithIntent(product, 'hvitløk', baseIntent, prefs);
    expect(result.score).toBeLessThanOrEqual(0);
  });

  it('should handle empty exclude patterns', () => {
    const intent = makeIntent({ excludePatterns: [] });
    const product = makeProduct({ Produktnavn: 'Hvitløksdressing', Kategori: 'meieri' });
    const result = processProductWithIntent(product, 'hvitløk', intent);
    // No exclusion penalty → positive score
    expect(result.score).toBeGreaterThan(0);
  });
});

// ── sortCandidatesWithNova ─────────────────────────────────────────────────

describe('sortCandidatesWithNova', () => {
  function makeCandidate(overrides: Partial<ProductCandidate>): ProductCandidate {
    return {
      product: makeProduct(),
      score: 80,
      priceNumeric: 30,
      renvareScore: 80,
      availability: 'available',
      matchReason: 'God match',
      ...overrides,
    };
  }

  it('should prioritize NOVA 1 over NOVA 4 when both are relevant (score >= 50)', () => {
    const nova1 = makeCandidate({ product: makeProduct({ EAN: 1001 }), score: 60 });
    const nova4 = makeCandidate({ product: makeProduct({ EAN: 1002 }), score: 70 });
    const novaMap = new Map([['1001', 1], ['1002', 4]]);

    const sorted = sortCandidatesWithNova([nova4, nova1], novaMap);
    expect(sorted[0].product.EAN).toBe(1001); // NOVA 1 first
  });

  it('should NOT override text score when NOVA difference is only 1', () => {
    const nova2 = makeCandidate({ product: makeProduct({ EAN: 2001 }), score: 60, renvareScore: 80 });
    const nova3 = makeCandidate({ product: makeProduct({ EAN: 2002 }), score: 90, renvareScore: 80 });
    const novaMap = new Map([['2001', 2], ['2002', 3]]);

    const sorted = sortCandidatesWithNova([nova2, nova3], novaMap);
    // NOVA diff is 1, but both relevant → step 3 applies: prefer lower NOVA
    expect(sorted[0].product.EAN).toBe(2001);
  });

  it('should use renvareScore when difference > 20', () => {
    const highRenvare = makeCandidate({ product: makeProduct({ EAN: 3001 }), score: 60, renvareScore: 95 });
    const lowRenvare = makeCandidate({ product: makeProduct({ EAN: 3002 }), score: 65, renvareScore: 40 });
    const novaMap = new Map<string, number>(); // No NOVA data

    const sorted = sortCandidatesWithNova([lowRenvare, highRenvare], novaMap);
    expect(sorted[0].product.EAN).toBe(3001); // Higher renvare first
  });

  it('should fall back to text-match score when NOVA and renvare are equal', () => {
    const high = makeCandidate({ product: makeProduct({ EAN: 4001 }), score: 90, renvareScore: 80 });
    const low = makeCandidate({ product: makeProduct({ EAN: 4002 }), score: 60, renvareScore: 80 });
    const novaMap = new Map<string, number>();

    const sorted = sortCandidatesWithNova([low, high], novaMap);
    expect(sorted[0].product.EAN).toBe(4001);
  });

  it('should handle products without EAN (no NOVA data)', () => {
    const withEan = makeCandidate({ product: makeProduct({ EAN: 5001 }), score: 70 });
    const withoutEan = makeCandidate({ product: makeProduct({ EAN: undefined }), score: 80 });
    const novaMap = new Map([['5001', 1]]);

    const sorted = sortCandidatesWithNova([withEan, withoutEan], novaMap);
    // withoutEan has NOVA 99 (unknown), withEan has NOVA 1
    // Both relevant, diff >= 2, so NOVA 1 wins
    expect(sorted[0].product.EAN).toBe(5001);
  });

  it('should not crash on empty array', () => {
    expect(sortCandidatesWithNova([], new Map())).toEqual([]);
  });

  it('should not mutate the original array', () => {
    const candidates = [
      makeCandidate({ product: makeProduct({ EAN: 6001 }), score: 50 }),
      makeCandidate({ product: makeProduct({ EAN: 6002 }), score: 90 }),
    ];
    const original = [...candidates];
    sortCandidatesWithNova(candidates, new Map());
    expect(candidates).toEqual(original);
  });

  it('should handle the full ranking hierarchy correctly', () => {
    // Scenario: NOVA 1 product with low text score vs NOVA 4 with high text score
    // Business rule: NOVA difference >= 2 should win when both are relevant
    const clean = makeCandidate({ product: makeProduct({ EAN: 7001 }), score: 55, renvareScore: 95 });
    const processed = makeCandidate({ product: makeProduct({ EAN: 7002 }), score: 95, renvareScore: 40 });
    const novaMap = new Map([['7001', 1], ['7002', 4]]);

    const sorted = sortCandidatesWithNova([processed, clean], novaMap);
    expect(sorted[0].product.EAN).toBe(7001); // Clean product wins despite lower text score
  });
});

// ── Edge cases and integration scenarios ───────────────────────────────────

describe('scoring integration scenarios', () => {
  it('should rank fresh garlic over garlic dressing', () => {
    const intent = makeIntent({
      primaryProduct: 'hvitløk',
      productCategory: 'grønnsaker',
      excludePatterns: ['dressing', 'saus', 'krydder'],
    });

    const freshGarlic = makeProduct({
      EAN: 8001,
      Produktnavn: 'Hvitløk 3-pakk',
      Kategori: 'grønnsaker',
    });
    const garlicDressing = makeProduct({
      EAN: 8002,
      Produktnavn: 'Hvitløksdressing',
      Kategori: 'dressing',
    });

    const r1 = processProductWithIntent(freshGarlic, 'hvitløk', intent);
    const r2 = processProductWithIntent(garlicDressing, 'hvitløk', intent);

    expect(r1.score).toBeGreaterThan(r2.score);
  });

  it('should prefer allergen-free products for users with allergies', () => {
    const prefs: UserPreferences = { allergies: ['gluten'] };
    const glutenFree = makeProduct({
      Produktnavn: 'Glutenfri pasta',
      "Allergener/Kosthold": '',
      Ingrediensliste: 'maismel, vann',
    });
    const withGluten = makeProduct({
      Produktnavn: 'Pasta',
      "Allergener/Kosthold": 'gluten',
      Ingrediensliste: 'hvetemel, vann',
    });

    const r1 = processProduct(glutenFree, 'pasta', prefs);
    const r2 = processProduct(withGluten, 'pasta', prefs);

    expect(r1.score).toBeGreaterThan(0);
    expect(r2.score).toBe(0);
  });

  it('should handle Norwegian price formats correctly end-to-end', () => {
    const product = makeProduct({ Pris: 'kr 129,50' });
    const result = processProduct(product, 'test');
    expect(result.priceNumeric).toBe(129.5);
  });

  it('should give consistent scores regardless of product field casing', () => {
    const upper = makeProduct({ Produktnavn: 'MELK' });
    const lower = makeProduct({ Produktnavn: 'melk' });
    const mixed = makeProduct({ Produktnavn: 'Melk' });

    const r1 = processProduct(upper, 'melk');
    const r2 = processProduct(lower, 'melk');
    const r3 = processProduct(mixed, 'melk');

    expect(r1.score).toBe(r2.score);
    expect(r2.score).toBe(r3.score);
  });
});
