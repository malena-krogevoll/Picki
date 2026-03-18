import { describe, it, expect } from "vitest";
import { removeUnitsFromIngredient } from "./ingredientUtils";

// =============================================================================
// removeUnitsFromIngredient — strips quantities and units from recipe ingredients
// Business rule: the result should be ONLY the ingredient name, ready for product search
// =============================================================================
describe("removeUnitsFromIngredient", () => {
  it.each([
    // [input, expected output]
    ["800g tomater", "tomater"],
    ["2 ss olivenolje", "olivenolje"],
    ["1 dl melk", "melk"],
    ["1.5 kg poteter", "poteter"],
    ["500 ml vann", "vann"],
    ["3 stk paprika", "paprika"],
    ["2 pk pølser", "pølser"],
    ["1 boks hermetiske tomater", "hermetiske tomater"],
    ["4 fedd hvitløk", "hvitløk"],
    ["2 stilker selleri", "selleri"],
    ["600g laksfilet", "laksfilet"],
  ])("should strip unit from '%s' → '%s'", (input, expected) => {
    expect(removeUnitsFromIngredient(input)).toBe(expected);
  });

  it("should strip standalone numbers", () => {
    expect(removeUnitsFromIngredient("2 bananer")).toBe("bananer");
  });

  it("should leave plain ingredient unchanged", () => {
    expect(removeUnitsFromIngredient("salt")).toBe("salt");
    expect(removeUnitsFromIngredient("pepper")).toBe("pepper");
  });

  it("should handle decimal with comma", () => {
    expect(removeUnitsFromIngredient("1,5 kg mel")).toBe("mel");
  });

  it("should trim whitespace", () => {
    expect(removeUnitsFromIngredient("  melk  ")).toBe("melk");
  });

  it("should handle empty string", () => {
    expect(removeUnitsFromIngredient("")).toBe("");
  });
});
