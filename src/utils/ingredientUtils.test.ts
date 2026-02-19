import { describe, it, expect } from "vitest";
import { removeUnitsFromIngredient } from "./ingredientUtils";

describe("removeUnitsFromIngredient", () => {
  it("removes grams", () => {
    expect(removeUnitsFromIngredient("800g tomater")).toBe("tomater");
  });

  it("removes tablespoons (ss)", () => {
    expect(removeUnitsFromIngredient("2 ss olivenolje")).toBe("olivenolje");
  });

  it("removes deciliters (dl)", () => {
    expect(removeUnitsFromIngredient("1 dl melk")).toBe("melk");
  });

  it("removes kg", () => {
    expect(removeUnitsFromIngredient("1.5 kg poteter")).toBe("poteter");
  });

  it("removes standalone numbers", () => {
    expect(removeUnitsFromIngredient("2 bananer")).toBe("bananer");
  });

  it("leaves plain ingredient unchanged", () => {
    expect(removeUnitsFromIngredient("salt")).toBe("salt");
  });
});
