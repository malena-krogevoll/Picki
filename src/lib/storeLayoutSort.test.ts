import { describe, it, expect } from "vitest";
import { categorizeProduct, groupItemsByCategory, storeLayoutOrder } from "./storeLayoutSort";

// =============================================================================
// 1. BASIC CATEGORIZATION — core keyword matching
// =============================================================================
describe("categorizeProduct – basic matching", () => {
  it.each([
    ["melk", "Meieriprodukter", "🥛"],
    ["laks", "Fisk og sjømat", "🐟"],
    ["brød", "Brød og bakervarer", "🥖"],
    ["kyllingfilet", "Kjøtt og ferskvare", "🥩"],
    ["pasta", "Pasta, ris og korn", "🍝"],
    ["brus", "Drikkevarer", "🥤"],
    ["chips", "Snacks og godteri", "🍫"],
    ["ketchup", "Sauser og krydder", "🧂"],
  ])("should categorize '%s' as '%s'", (query, expectedCategory, expectedEmoji) => {
    const result = categorizeProduct(query);
    expect(result.category).toBe(expectedCategory);
    expect(result.emoji).toBe(expectedEmoji);
  });
});

// =============================================================================
// 2. UNKNOWN PRODUCTS — fallback to "Annet"
// =============================================================================
describe("categorizeProduct – unknown products", () => {
  it("should return 'Annet' for unrecognized product", () => {
    const result = categorizeProduct("superobskurprodukt123");
    expect(result.category).toBe("Annet");
    expect(result.emoji).toBe("📦");
    expect(result.sortOrder).toBe(storeLayoutOrder.length);
  });

  it("should return 'Annet' for empty string", () => {
    expect(categorizeProduct("").category).toBe("Annet");
  });
});

// =============================================================================
// 3. CASE INSENSITIVITY — Norwegian products have varied casing
// =============================================================================
describe("categorizeProduct – case insensitivity", () => {
  it.each([
    ["Melk", "Meieriprodukter"],
    ["MELK", "Meieriprodukter"],
    ["Brød", "Brød og bakervarer"],
  ])("should match '%s' case-insensitively", (query, expected) => {
    expect(categorizeProduct(query).category).toBe(expected);
  });
});

// =============================================================================
// 4. LONGEST KEYWORD MATCH — avoids "potet" matching before "potetgull"
// =============================================================================
describe("categorizeProduct – longest match priority", () => {
  it("should match 'potetgull' to Snacks, not Frukt og grønt (via 'potet')", () => {
    expect(categorizeProduct("potetgull").category).toBe("Snacks og godteri");
  });

  it("should match 'kyllingfilet' to Kjøtt, not just via 'kylling'", () => {
    expect(categorizeProduct("kyllingfilet").category).toBe("Kjøtt og ferskvare");
  });
});

// =============================================================================
// 5. COMPOUND DAIRY PRODUCTS — "lettmelk", "skummetmelk" contain "melk"
// =============================================================================
describe("categorizeProduct – compound product names", () => {
  it.each([
    ["lettmelk", "Meieriprodukter"],
    ["skummetmelk", "Meieriprodukter"],
    ["havremelk", "Meieriprodukter"],
    ["eplejuice", "Drikkevarer"],
  ])("should categorize '%s' correctly via substring matching", (query, expected) => {
    expect(categorizeProduct(query).category).toBe(expected);
  });
});

// =============================================================================
// 6. PRODUCT NAME AND BRAND PARAMETERS — additional context for matching
// =============================================================================
describe("categorizeProduct – multi-parameter matching", () => {
  it("should use productName for categorization", () => {
    const result = categorizeProduct("filet", "Lerøy Laksefilet");
    expect(result.category).toBe("Fisk og sjømat");
  });

  it("should use brand for categorization", () => {
    const result = categorizeProduct("fisk", undefined, "Lerøy");
    expect(result.category).toBe("Fisk og sjømat");
  });
});

// =============================================================================
// 7. groupItemsByCategory — sorting and grouping
// =============================================================================
describe("groupItemsByCategory", () => {
  it("should group items and sort by store layout order", () => {
    const items = [
      { id: "1", name: "laks" },
      { id: "2", name: "melk" },
      { id: "3", name: "eple" },
    ];
    const groups = groupItemsByCategory(items);

    expect(groups.length).toBe(3);
    const categories = groups.map(g => g.category);
    // Frukt og grønt comes before Meieriprodukter, which comes before Fisk og sjømat
    const fruitIdx = categories.indexOf("Frukt og grønt");
    const dairyIdx = categories.indexOf("Meieriprodukter");
    const fishIdx = categories.indexOf("Fisk og sjømat");
    expect(fruitIdx).toBeLessThan(dairyIdx);
    expect(dairyIdx).toBeLessThan(fishIdx);
  });

  it("should group multiple items in same category together", () => {
    const items = [
      { id: "1", name: "melk" },
      { id: "2", name: "eple" },
      { id: "3", name: "yoghurt" },
    ];
    const groups = groupItemsByCategory(items);
    const dairyGroup = groups.find(g => g.category === "Meieriprodukter");
    expect(dairyGroup?.items).toHaveLength(2);
  });

  it("should return empty array for empty input", () => {
    expect(groupItemsByCategory([])).toEqual([]);
  });

  it("should use getProductInfo callback when provided", () => {
    const items = [{ id: "1", name: "ukjent" }];
    const groups = groupItemsByCategory(items, (id) =>
      id === "1" ? { name: "Tine Lettmelk", brand: "Tine" } : undefined
    );
    expect(groups[0].category).toBe("Meieriprodukter");
  });
});
