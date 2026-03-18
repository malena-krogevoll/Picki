import { describe, it, expect } from "vitest";
import { categorizeProduct, groupItemsByCategory } from "./storeLayoutSort";

describe("categorizeProduct", () => {
  it("categorizes milk as Meieriprodukter", () => {
    const result = categorizeProduct("melk");
    expect(result.category).toBe("Meieriprodukter");
    expect(result.emoji).toBe("🥛");
  });

  it("categorizes salmon as Fisk og sjømat", () => {
    const result = categorizeProduct("laks");
    expect(result.category).toBe("Fisk og sjømat");
  });

  it("categorizes bread as Brød og bakervarer", () => {
    const result = categorizeProduct("brød");
    expect(result.category).toBe("Brød og bakervarer");
  });

  it("categorizes chicken as Kjøtt og ferskvare", () => {
    const result = categorizeProduct("kyllingfilet");
    expect(result.category).toBe("Kjøtt og ferskvare");
  });

  it("returns Annet for unknown products", () => {
    const result = categorizeProduct("superobskurprodukt123");
    expect(result.category).toBe("Annet");
    expect(result.emoji).toBe("📦");
  });

  it("uses product name for categorization", () => {
    const result = categorizeProduct("fisk", "Lerøy Laksefilet");
    expect(result.category).toBe("Fisk og sjømat");
  });

  it("prefers longest keyword match", () => {
    // "potetgull" should match Snacks, not Frukt og grønt (via "potet")
    const result = categorizeProduct("potetgull");
    expect(result.category).toBe("Snacks og godteri");
  });

  it("is case-insensitive", () => {
    const result = categorizeProduct("Melk");
    expect(result.category).toBe("Meieriprodukter");
  });

  it("handles empty string", () => {
    const result = categorizeProduct("");
    expect(result.category).toBe("Annet");
  });

  it("categorizes compound dairy products", () => {
    expect(categorizeProduct("lettmelk").category).toBe("Meieriprodukter");
    expect(categorizeProduct("skummetmelk").category).toBe("Meieriprodukter");
  });

  it("categorizes via productBrand parameter", () => {
    const result = categorizeProduct("filet", "Lerøy", "Lerøy");
    expect(result.category).toBe("Fisk og sjømat");
  });
});

describe("groupItemsByCategory", () => {
  it("groups items by category and sorts by store layout", () => {
    const items = [
      { id: "1", name: "laks" },
      { id: "2", name: "melk" },
      { id: "3", name: "eple" },
    ];
    const groups = groupItemsByCategory(items);
    
    expect(groups.length).toBeGreaterThanOrEqual(3);
    // Frukt og grønt should come before Meieriprodukter
    const fruitIdx = groups.findIndex(g => g.category === "Frukt og grønt");
    const dairyIdx = groups.findIndex(g => g.category === "Meieriprodukter");
    expect(fruitIdx).toBeLessThan(dairyIdx);
  });
});
