import { describe, it, expect } from "vitest";
import {
  analyzeProductMatch,
  sortProductsByPreference,
  type UserPreferences,
  type MatchInfo,
} from "./preferenceAnalysis";

// =============================================================================
// TEST HELPERS
// =============================================================================
const makePrefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  allergies: [],
  diets: [],
  other_preferences: { organic: false, lowest_price: false },
  priority_order: [],
  ...overrides,
});

const makeProduct = (overrides: Partial<{ name: string; brand: string; ingredienser: string; allergener: string }> = {}) => ({
  name: overrides.name ?? "Testprodukt",
  brand: overrides.brand ?? "TestMerke",
  ingredienser: overrides.ingredienser ?? "",
  allergener: overrides.allergener ?? "",
});

const makeMatchInfo = (overrides: Partial<MatchInfo> = {}): MatchInfo => ({
  allergyWarnings: [],
  allergyTriggers: {},
  dietWarnings: [],
  dietMatches: [],
  organicMatch: false,
  animalWelfareLevel: "unknown" as const,
  localFoodMatch: false,
  matchScore: 50,
  ...overrides,
});

// =============================================================================
// 1. ALLERGEN DETECTION — safety-critical, must never have false negatives
// =============================================================================
describe("analyzeProductMatch – allergens", () => {
  it("should detect gluten in ingredients via wheat keyword", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "hvetemel, vann, salt" }),
      makePrefs({ allergies: ["gluten"] })
    );
    expect(result.allergyWarnings).toContain("gluten");
    expect(result.allergyTriggers["gluten"]).toContain("hvetemel");
  });

  it("should detect milk allergen from 'melk' in ingredients", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "melk, kultur" }),
      makePrefs({ allergies: ["melk"] })
    );
    expect(result.allergyWarnings).toContain("melk");
  });

  it("should detect multiple allergens simultaneously", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "hvetemel, melk, egg, sukker" }),
      makePrefs({ allergies: ["gluten", "melk", "egg"] })
    );
    expect(result.allergyWarnings).toContain("gluten");
    expect(result.allergyWarnings).toContain("melk");
    expect(result.allergyWarnings).toContain("egg");
    expect(result.matchScore).toBeLessThan(10);
  });

  it("should NOT warn when no allergens match", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "ris" }),
      makePrefs({ allergies: ["gluten", "melk"] })
    );
    expect(result.allergyWarnings).toHaveLength(0);
  });

  it("should NOT warn when ingredients are empty (cannot verify)", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "" }),
      makePrefs({ allergies: ["gluten"] })
    );
    expect(result.allergyWarnings).toHaveLength(0);
  });

  it("should heavily penalize allergen matches in score", () => {
    const withAllergen = analyzeProductMatch(
      makeProduct({ ingredienser: "hvetemel, vann" }),
      makePrefs({ allergies: ["gluten"] })
    );
    const noAllergen = analyzeProductMatch(
      makeProduct({ ingredienser: "ris" }),
      makePrefs({ allergies: ["gluten"] })
    );
    expect(withAllergen.matchScore).toBeLessThan(noAllergen.matchScore);
  });
});

// =============================================================================
// 2. DIET CHECKING — vegetar, vegan, etc.
// =============================================================================
describe("analyzeProductMatch – diets", () => {
  it("should warn when product contains meat for vegan diet", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "svinekjøtt, storfe" }),
      makePrefs({ diets: ["vegan"] })
    );
    expect(result.dietWarnings).toContain("vegan");
  });

  it("should match product labeled as 'vegansk'", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Vegansk burgere", ingredienser: "erter, olje" }),
      makePrefs({ diets: ["vegan"] })
    );
    expect(result.dietMatches).toContain("vegan");
  });

  it("should warn when product contains fish for vegetar diet", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "fisk, mel, melk" }),
      makePrefs({ diets: ["vegetar"] })
    );
    expect(result.dietWarnings).toContain("vegetar");
  });
});

// =============================================================================
// 3. ORGANIC PREFERENCE — Norwegian "økologisk" matching
// =============================================================================
describe("analyzeProductMatch – organic preference", () => {
  it("should detect 'økologisk' in product name", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Økologisk melk", brand: "Tine" }),
      makePrefs({ other_preferences: { organic: true, lowest_price: false } })
    );
    expect(result.organicMatch).toBe(true);
    expect(result.matchScore).toBeGreaterThan(50);
  });

  it("should penalize non-organic product when organic is preferred", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Vanlig melk" }),
      makePrefs({ other_preferences: { organic: true, lowest_price: false } })
    );
    expect(result.organicMatch).toBe(false);
  });
});

// =============================================================================
// 4. ANIMAL WELFARE — Norwegian-specific brand/label detection
// =============================================================================
describe("analyzeProductMatch – animal welfare", () => {
  it("should detect high welfare brand (Rørosmeieriet)", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Melk", brand: "Rørosmeieriet", ingredienser: "melk" }),
      makePrefs()
    );
    expect(result.animalWelfareLevel).toBe("high");
  });

  it("should return 'not_applicable' for non-animal product", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Ris", ingredienser: "ris" }),
      makePrefs()
    );
    expect(result.animalWelfareLevel).toBe("not_applicable");
  });

  it("should return 'unknown' for animal product without welfare marking", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Kyllingfilet", brand: "UkjentMerke", ingredienser: "kylling" }),
      makePrefs()
    );
    expect(result.animalWelfareLevel).toBe("unknown");
  });
});

// =============================================================================
// 5. LOCAL FOOD — Norwegian brand detection
// =============================================================================
describe("analyzeProductMatch – local food", () => {
  it("should detect Tine as local food", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Melk", brand: "Tine", ingredienser: "melk" }),
      makePrefs()
    );
    expect(result.localFoodMatch).toBe(true);
  });

  it("should return false for non-local product", () => {
    const result = analyzeProductMatch(
      makeProduct({ name: "Exotic Juice", brand: "ForeignBrand" }),
      makePrefs()
    );
    expect(result.localFoodMatch).toBe(false);
  });
});

// =============================================================================
// 6. MATCH SCORE — composition and boundary behavior
// =============================================================================
describe("analyzeProductMatch – match score", () => {
  it("should return 50 when no user preferences (null)", () => {
    const result = analyzeProductMatch(makeProduct({ ingredienser: "melk" }), null);
    expect(result.matchScore).toBe(50);
  });

  it("should return score between 0 and 100", () => {
    const result = analyzeProductMatch(
      makeProduct({ ingredienser: "hvetemel, melk, egg" }),
      makePrefs({ allergies: ["gluten", "melk", "egg"] })
    );
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it("should boost score when priority matches are present", () => {
    const withPriority = analyzeProductMatch(
      makeProduct({ name: "Økologisk melk", brand: "Tine", ingredienser: "melk" }),
      makePrefs({
        other_preferences: { organic: true, lowest_price: false, local_food: true },
        priority_order: ["organic", "local_food"],
      })
    );
    const noPriority = analyzeProductMatch(
      makeProduct({ name: "Økologisk melk", brand: "Tine", ingredienser: "melk" }),
      null
    );
    expect(withPriority.matchScore).toBeGreaterThan(noPriority.matchScore);
  });
});

// =============================================================================
// 7. SORTING — products must be ordered by preference then NOVA then price
// =============================================================================
describe("sortProductsByPreference", () => {
  const makeSortItem = (overrides: {
    matchInfo?: Partial<MatchInfo>;
    novaScore?: number;
    price?: number | null;
  } = {}) => ({
    matchInfo: makeMatchInfo(overrides.matchInfo),
    novaScore: overrides.novaScore ?? 1,
    price: overrides.price ?? 10,
  });

  it("should put allergen-warning products last", () => {
    const products = [
      makeSortItem({ matchInfo: { allergyWarnings: ["gluten"], matchScore: 50 } }),
      makeSortItem({ matchInfo: { allergyWarnings: [], matchScore: 80 } }),
    ];
    const sorted = sortProductsByPreference(products, null);
    expect(sorted[0].matchInfo.allergyWarnings).toHaveLength(0);
    expect(sorted[1].matchInfo.allergyWarnings).toContain("gluten");
  });

  it("should sort by matchScore when no allergen warnings", () => {
    const products = [
      makeSortItem({ matchInfo: { matchScore: 60 } }),
      makeSortItem({ matchInfo: { matchScore: 90 } }),
    ];
    const sorted = sortProductsByPreference(products, null);
    expect(sorted[0].matchInfo.matchScore).toBe(90);
    expect(sorted[1].matchInfo.matchScore).toBe(60);
  });

  it("should use NOVA score as tiebreaker (lower = better)", () => {
    const products = [
      makeSortItem({ matchInfo: { matchScore: 80 }, novaScore: 4 }),
      makeSortItem({ matchInfo: { matchScore: 80 }, novaScore: 1 }),
    ];
    const sorted = sortProductsByPreference(products, null);
    expect(sorted[0].novaScore).toBe(1);
  });

  it("should use price as final tiebreaker (lower = better)", () => {
    const products = [
      makeSortItem({ matchInfo: { matchScore: 80 }, novaScore: 2, price: 50 }),
      makeSortItem({ matchInfo: { matchScore: 80 }, novaScore: 2, price: 30 }),
    ];
    const sorted = sortProductsByPreference(products, null);
    expect(sorted[0].price).toBe(30);
  });

  it("should handle null prices (sort last within same tier)", () => {
    const products = [
      makeSortItem({ matchInfo: { matchScore: 80 }, novaScore: 2, price: null }),
      makeSortItem({ matchInfo: { matchScore: 80 }, novaScore: 2, price: 30 }),
    ];
    const sorted = sortProductsByPreference(products, null);
    expect(sorted[0].price).toBe(30);
  });

  it("should not mutate original array", () => {
    const products = [
      makeSortItem({ matchInfo: { matchScore: 60 } }),
      makeSortItem({ matchInfo: { matchScore: 90 } }),
    ];
    const original = [...products];
    sortProductsByPreference(products, null);
    expect(products[0]).toBe(original[0]);
  });
});
