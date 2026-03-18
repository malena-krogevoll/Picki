import { describe, it, expect } from "vitest";
import { parseShoppingListText, formatParsedItem } from "./textParser";

// =============================================================================
// HELPER: extract just the product names from a parse result
// =============================================================================
const names = (text: string) => parseShoppingListText(text).map(r => r.product_name);

// =============================================================================
// 1. BASIC SPLITTING — the parser must handle common list separators
// =============================================================================
describe("parseShoppingListText – splitting", () => {
  it.each([
    ["comma-separated", "melk, egg, brød", ["melk", "egg", "brød"]],
    ["newline-separated", "melk\negg\nbrød", ["melk", "egg", "brød"]],
    ["semicolon-separated", "melk; egg; brød", ["melk", "egg", "brød"]],
    ["mixed separators", "melk, egg\nbrød; ost", ["melk", "egg", "brød", "ost"]],
  ])("should split %s items", (_label, input, expected) => {
    expect(names(input)).toEqual(expected);
  });

  it("should handle many items (stress test)", () => {
    const items = Array.from({ length: 50 }, (_, i) => `produkt${i}`);
    expect(parseShoppingListText(items.join(", "))).toHaveLength(50);
  });
});

// =============================================================================
// 2. EMPTY / INVALID INPUT — must never crash, always return []
// =============================================================================
describe("parseShoppingListText – empty and invalid input", () => {
  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["only commas", ",,,"],
    ["only separators", ", ; \n"],
  ])("should return [] for %s", (_label, input) => {
    expect(parseShoppingListText(input)).toEqual([]);
  });

  it("should filter out items with names shorter than 2 characters", () => {
    expect(parseShoppingListText("a")).toEqual([]);
    expect(parseShoppingListText("a, melk")).toHaveLength(1);
  });
});

// =============================================================================
// 3. QUANTITY EXTRACTION — core business logic for shopping lists
// =============================================================================
describe("parseShoppingListText – quantities", () => {
  it("should extract integer quantity", () => {
    const [item] = parseShoppingListText("2 bananer");
    expect(item.quantity).toBe(2);
    expect(item.product_name).toBe("bananer");
  });

  it("should default quantity to 1 when not specified", () => {
    const [item] = parseShoppingListText("melk");
    expect(item.quantity).toBe(1);
  });

  it("should handle '3x' quantity pattern", () => {
    const [item] = parseShoppingListText("3x epler");
    expect(item.quantity).toBe(3);
    expect(item.product_name).toBe("epler");
  });

  it("should floor decimal quantities to integer (1,5 → 1)", () => {
    // Norwegian decimal comma: "1,5 kg mel" should be ONE item with qty 1
    const result = parseShoppingListText("1,5 kg mel");
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe("mel");
    expect(result[0].quantity).toBe(1);
  });

  it("should handle dot decimal (1.5 → 1)", () => {
    const [item] = parseShoppingListText("1.5 dl melk");
    expect(item.quantity).toBe(1);
    expect(item.product_name).toBe("melk");
  });
});

// =============================================================================
// 4. NORWEGIAN DECIMAL COMMA vs LIST COMMA — critical Norwegian locale issue
//    Rule: digit,digit is a decimal separator. All other commas are list separators.
// =============================================================================
describe("parseShoppingListText – decimal comma handling", () => {
  it("should NOT split '1,5 kg mel' — comma is decimal separator", () => {
    const result = parseShoppingListText("1,5 kg mel");
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe("mel");
  });

  it("should NOT split '0,25 dl fløte' — comma is decimal separator", () => {
    const result = parseShoppingListText("0,25 dl fløte");
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe("fløte");
  });

  it("SHOULD split 'melk, egg' — comma is list separator", () => {
    expect(names("melk, egg")).toEqual(["melk", "egg"]);
  });

  it("should handle mix of decimal commas and list commas", () => {
    const result = parseShoppingListText("1,5 kg mel, 2 egg, 0,5 dl olje");
    expect(result).toHaveLength(3);
    expect(result.map(r => r.product_name)).toEqual(["mel", "egg", "olje"]);
  });
});

// =============================================================================
// 5. UNIT STRIPPING — units should be removed, leaving only the ingredient
// =============================================================================
describe("parseShoppingListText – unit stripping", () => {
  it.each([
    ["200 g pasta", "pasta"],
    ["2 dl melk", "melk"],
    ["3 stk paprika", "paprika"],
    ["2 pk pølser", "pølser"],
    ["1 kg poteter", "poteter"],
    ["500 ml vann", "vann"],
    ["1 boks tomater", "tomater"],
    ["2 ss olivenolje", "olivenolje"],
    ["1 ts salt", "salt"],
    ["1 flaske vin", "vin"],
    ["1 bunt persille", "persille"],
  ])("should strip unit from '%s' → '%s'", (input, expectedName) => {
    const result = parseShoppingListText(input);
    expect(result[0].product_name).toBe(expectedName);
  });
});

// =============================================================================
// 6. PREPARATION METHOD STRIPPING — "paprika i terninger" → "paprika"
// =============================================================================
describe("parseShoppingListText – preparation stripping", () => {
  it.each([
    ["paprika i terninger", "paprika"],
    ["løk hakket", "løk"],
    ["gulrot i strimler", "gulrot"],
    ["ost revet", "ost"],
    ["hvitløk finhakket", "hvitløk"],
  ])("should strip prep from '%s' → '%s'", (input, expectedName) => {
    expect(names(input)).toEqual([expectedName]);
  });
});

// =============================================================================
// 7. NOTES IN PARENTHESES — "(grovt)" should be extracted as notes
// =============================================================================
describe("parseShoppingListText – notes", () => {
  it("should extract parenthetical notes", () => {
    const [item] = parseShoppingListText("brød (grovt)");
    expect(item.product_name).toBe("brød");
    expect(item.notes).toBe("grovt");
  });

  it("should have undefined notes when no parentheses", () => {
    const [item] = parseShoppingListText("melk");
    expect(item.notes).toBeUndefined();
  });
});

// =============================================================================
// 8. BULLET POINT AND NUMBERED LISTS — common copy-paste from recipes
// =============================================================================
describe("parseShoppingListText – list prefixes", () => {
  it("should strip bullet markers (•, -, *) and return clean names", () => {
    const result = names("• melk\n- egg\n* brød");
    expect(result).toEqual(["melk", "egg", "brød"]);
  });

  it("should strip numbered list prefixes (1., 2., 3.)", () => {
    const result = names("1. melk\n2. egg\n3. brød");
    expect(result).toEqual(["melk", "egg", "brød"]);
  });

  it("should handle numbered lists with parentheses (1) melk)", () => {
    const result = names("1) melk\n2) egg");
    expect(result).toEqual(["melk", "egg"]);
  });

  it("should handle bullet + quantity combined", () => {
    const result = parseShoppingListText("• 2 stk paprika\n- 500 g kjøttdeig");
    expect(result[0]).toMatchObject({ product_name: "paprika", quantity: 2 });
    expect(result[1]).toMatchObject({ product_name: "kjøttdeig", quantity: 1 });
  });
});

// =============================================================================
// 9. WHITESPACE AND SPECIAL CHARACTERS — robustness
// =============================================================================
describe("parseShoppingListText – whitespace and edge cases", () => {
  it("should normalize multiple spaces", () => {
    expect(names("  melk  ")).toEqual(["melk"]);
  });

  it("should handle tab characters in input", () => {
    expect(names("melk\tegg")).toEqual(["melk\tegg"]); // tabs are not separators, kept as-is
  });

  it("should handle trailing/leading separators", () => {
    expect(names(",melk,egg,")).toEqual(["melk", "egg"]);
  });
});

// =============================================================================
// 10. formatParsedItem — round-trip formatting
// =============================================================================
describe("formatParsedItem", () => {
  it.each([
    [{ product_name: "epler", quantity: 3 }, "3 epler"],
    [{ product_name: "melk", quantity: 1 }, "melk"],
    [{ product_name: "brød", quantity: 1, notes: "grovt" }, "brød (grovt)"],
    [{ product_name: "egg", quantity: 6, notes: "økologisk" }, "6 egg (økologisk)"],
  ])("should format %j → '%s'", (input, expected) => {
    expect(formatParsedItem(input)).toBe(expected);
  });
});
