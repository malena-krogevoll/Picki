import { describe, it, expect } from "vitest";
import { analyzeProductMatch, sortProductsByPreference, type UserPreferences } from "./preferenceAnalysis";

const makePrefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  allergies: [],
  diets: [],
  other_preferences: { organic: false, lowest_price: false },
  priority_order: [],
  ...overrides,
});

describe("analyzeProductMatch - allergens", () => {
  it("detects gluten in ingredients", () => {
    const result = analyzeProductMatch(
      { name: "Brød", brand: "Test", ingredienser: "hvetemel, vann, salt" },
      makePrefs({ allergies: ["gluten"] })
    );
    expect(result.allergyWarnings).toContain("gluten");
  });

  it("detects milk allergen", () => {
    const result = analyzeProductMatch(
      { name: "Yoghurt", brand: "Tine", ingredienser: "melk, kultur" },
      makePrefs({ allergies: ["melk"] })
    );
    expect(result.allergyWarnings).toContain("melk");
  });

  it("returns no warnings when no allergens match", () => {
    const result = analyzeProductMatch(
      { name: "Ris", brand: "Test", ingredienser: "ris" },
      makePrefs({ allergies: ["gluten", "melk"] })
    );
    expect(result.allergyWarnings).toHaveLength(0);
  });

  it("returns no warnings when ingredients are empty", () => {
    const result = analyzeProductMatch(
      { name: "Ukjent", brand: "Test", ingredienser: "" },
      makePrefs({ allergies: ["gluten"] })
    );
    expect(result.allergyWarnings).toHaveLength(0);
  });
});

describe("analyzeProductMatch - diets", () => {
  it("warns when product contains meat for vegan diet", () => {
    const result = analyzeProductMatch(
      { name: "Kjøttdeig", brand: "Gilde", ingredienser: "svinekjøtt, storfe" },
      makePrefs({ diets: ["vegan"] })
    );
    expect(result.dietWarnings).toContain("vegan");
  });

  it("matches product labeled as vegansk", () => {
    const result = analyzeProductMatch(
      { name: "Vegansk burgere", brand: "Test", ingredienser: "erter, olje" },
      makePrefs({ diets: ["vegan"] })
    );
    expect(result.dietMatches).toContain("vegan");
  });

  it("warns when product contains fish for vegetar diet", () => {
    const result = analyzeProductMatch(
      { name: "Fiskekaker", brand: "Test", ingredienser: "fisk, mel, melk" },
      makePrefs({ diets: ["vegetar"] })
    );
    expect(result.dietWarnings).toContain("vegetar");
  });
});

describe("analyzeProductMatch - animal welfare", () => {
  it("detects high welfare brand", () => {
    const result = analyzeProductMatch(
      { name: "Melk", brand: "Rørosmeieriet", ingredienser: "melk" },
      makePrefs()
    );
    expect(result.animalWelfareLevel).toBe("high");
  });

  it("returns not_applicable for non-animal product", () => {
    const result = analyzeProductMatch(
      { name: "Ris", brand: "Test", ingredienser: "ris" },
      makePrefs()
    );
    expect(result.animalWelfareLevel).toBe("not_applicable");
  });
});

describe("analyzeProductMatch - local food", () => {
  it("detects Tine as local food", () => {
    const result = analyzeProductMatch(
      { name: "Melk", brand: "Tine", ingredienser: "melk" },
      makePrefs()
    );
    expect(result.localFoodMatch).toBe(true);
  });

  it("returns false for non-local product", () => {
    const result = analyzeProductMatch(
      { name: "Exotic Juice", brand: "ForeignBrand", ingredienser: "juice" },
      makePrefs()
    );
    expect(result.localFoodMatch).toBe(false);
  });
});

describe("analyzeProductMatch - match score", () => {
  it("penalizes allergen warnings heavily", () => {
    const withAllergen = analyzeProductMatch(
      { name: "Brød", brand: "Test", ingredienser: "hvetemel, vann" },
      makePrefs({ allergies: ["gluten"] })
    );
    const noAllergen = analyzeProductMatch(
      { name: "Ris", brand: "Test", ingredienser: "ris" },
      makePrefs({ allergies: ["gluten"] })
    );
    expect(withAllergen.matchScore).toBeLessThan(noAllergen.matchScore);
  });

  it("returns 50 when no user preferences", () => {
    const result = analyzeProductMatch(
      { name: "Melk", brand: "Test", ingredienser: "melk" },
      null
    );
    expect(result.matchScore).toBe(50);
  });
});

describe("sortProductsByPreference", () => {
  it("puts allergen-warning products last", () => {
    const products = [
      { matchInfo: { allergyWarnings: ["gluten"], allergyTriggers: {}, dietWarnings: [], dietMatches: [], organicMatch: false, animalWelfareLevel: 'unknown' as const, localFoodMatch: false, matchScore: 50 }, novaScore: 1, price: 10 },
      { matchInfo: { allergyWarnings: [], allergyTriggers: {}, dietWarnings: [], dietMatches: [], organicMatch: false, animalWelfareLevel: 'unknown' as const, localFoodMatch: false, matchScore: 80 }, novaScore: 1, price: 10 },
    ];
    const sorted = sortProductsByPreference(products, null);
    expect(sorted[0].matchInfo.allergyWarnings).toHaveLength(0);
    expect(sorted[1].matchInfo.allergyWarnings).toContain("gluten");
  });
});
