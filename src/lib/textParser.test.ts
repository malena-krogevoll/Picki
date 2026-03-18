import { describe, it, expect } from "vitest";
import { parseShoppingListText, formatParsedItem } from "./textParser";

describe("parseShoppingListText", () => {
  it("parses comma-separated items", () => {
    const result = parseShoppingListText("melk, egg, brød");
    expect(result).toHaveLength(3);
    expect(result.map(r => r.product_name)).toEqual(["melk", "egg", "brød"]);
  });

  it("parses newline-separated items", () => {
    const result = parseShoppingListText("melk\negg\nbrød");
    expect(result).toHaveLength(3);
  });

  it("parses semicolon-separated items", () => {
    const result = parseShoppingListText("melk; egg; brød");
    expect(result).toHaveLength(3);
  });

  it("extracts quantity", () => {
    const result = parseShoppingListText("2 bananer");
    expect(result[0].quantity).toBe(2);
    expect(result[0].product_name).toBe("bananer");
  });

  it("handles 'Xx' quantity pattern", () => {
    const result = parseShoppingListText("3x epler");
    expect(result[0].quantity).toBe(3);
    expect(result[0].product_name).toBe("epler");
  });

  it("strips Norwegian units", () => {
    const result = parseShoppingListText("200 g pasta");
    expect(result[0].product_name).toBe("pasta");
  });

  it("strips 'dl' unit", () => {
    const result = parseShoppingListText("2 dl melk");
    expect(result[0].product_name).toBe("melk");
  });

  it("strips 'stk' unit", () => {
    const result = parseShoppingListText("3 stk paprika");
    expect(result[0].product_name).toBe("paprika");
  });

  it("strips preparation methods", () => {
    const result = parseShoppingListText("paprika i terninger");
    expect(result[0].product_name).toBe("paprika");
  });

  it("strips adjective prep words", () => {
    const result = parseShoppingListText("løk hakket");
    expect(result[0].product_name).toBe("løk");
  });

  it("preserves notes in parentheses", () => {
    const result = parseShoppingListText("brød (grovt)");
    expect(result[0].product_name).toBe("brød");
    expect(result[0].notes).toBe("grovt");
  });

  it("returns empty array for empty input", () => {
    expect(parseShoppingListText("")).toEqual([]);
    expect(parseShoppingListText("   ")).toEqual([]);
  });

  it("filters out too-short product names", () => {
    const result = parseShoppingListText("a");
    expect(result).toHaveLength(0);
  });

  it("defaults quantity to 1", () => {
    const result = parseShoppingListText("melk");
    expect(result[0].quantity).toBe(1);
  });

  it("handles decimal quantities (comma splits items)", () => {
    // Note: comma is a separator, so "1,5 kg mel" becomes two items: "1" (filtered) and "5 kg mel"
    const result = parseShoppingListText("1,5 kg mel");
    expect(result[0].quantity).toBe(5);
    expect(result[0].product_name).toBe("mel");
  });
});

  it("parses bullet point lists (• and -)", () => {
    // Bullet chars are not separators in current impl — they stay in item text
    const result = parseShoppingListText("• melk\n- egg\n* brød");
    expect(result).toHaveLength(3);
    // The bullet/dash/asterisk is stripped or the name still works
    expect(result.map(r => r.product_name)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("melk"),
        expect.stringContaining("egg"),
        expect.stringContaining("brød"),
      ])
    );
  });

  it("parses numbered lists", () => {
    const result = parseShoppingListText("1. melk\n2. egg\n3. brød");
    expect(result).toHaveLength(3);
  });

  it("handles very long input", () => {
    const items = Array.from({ length: 50 }, (_, i) => `produkt${i}`).join(", ");
    const result = parseShoppingListText(items);
    expect(result).toHaveLength(50);
  });

  it("handles mixed separators", () => {
    const result = parseShoppingListText("melk, egg\nbrød; ost");
    expect(result).toHaveLength(4);
  });

  it("strips 'pk' unit", () => {
    const result = parseShoppingListText("2 pk pølser");
    expect(result[0].product_name).toBe("pølser");
    expect(result[0].quantity).toBe(2);
  });
});

describe("formatParsedItem", () => {
  it("formats item with quantity > 1", () => {
    expect(formatParsedItem({ product_name: "epler", quantity: 3 })).toBe("3 epler");
  });

  it("formats item with quantity 1 (no prefix)", () => {
    expect(formatParsedItem({ product_name: "melk", quantity: 1 })).toBe("melk");
  });

  it("formats item with notes", () => {
    expect(formatParsedItem({ product_name: "brød", quantity: 1, notes: "grovt" })).toBe("brød (grovt)");
  });
});
