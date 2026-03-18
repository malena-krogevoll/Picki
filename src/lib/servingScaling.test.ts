import { describe, it, expect } from "vitest";
import { scaleQuantity, scaleFactor, defaultServings } from "./servingScaling";

// =============================================================================
// scaleFactor
// =============================================================================
describe("scaleFactor", () => {
  it("returns 1 when original is 0", () => {
    expect(scaleFactor(4, 0)).toBe(1);
  });
  it("returns 1 when desired equals original", () => {
    expect(scaleFactor(4, 4)).toBe(1);
  });
  it("doubles when desired is twice original", () => {
    expect(scaleFactor(8, 4)).toBe(2);
  });
  it("halves correctly", () => {
    expect(scaleFactor(2, 4)).toBe(0.5);
  });
});

// =============================================================================
// scaleQuantity — core ingredient scaling
// =============================================================================
describe("scaleQuantity", () => {
  describe("null / empty handling", () => {
    it("returns empty string for null", () => {
      expect(scaleQuantity(null, 2)).toBe("");
    });
    it("returns empty string for undefined", () => {
      expect(scaleQuantity(undefined, 2)).toBe("");
    });
    it("returns empty string for empty string", () => {
      expect(scaleQuantity("", 2)).toBe("");
    });
    it("returns empty string for whitespace", () => {
      expect(scaleQuantity("   ", 2)).toBe("");
    });
  });

  describe("plain text (no number)", () => {
    it("returns text as-is", () => {
      expect(scaleQuantity("etter smak", 2)).toBe("etter smak");
    });
  });

  describe("integer quantities", () => {
    it("scales integer up", () => {
      expect(scaleQuantity("2", 2)).toBe("4");
    });
    it("scales integer down to whole number", () => {
      expect(scaleQuantity("4", 0.5)).toBe("2");
    });
    it("scales integer down to decimal", () => {
      expect(scaleQuantity("3", 0.5)).toBe("1,5");
    });
  });

  describe("decimal with dot", () => {
    it("scales 1.5 × 2", () => {
      expect(scaleQuantity("1.5", 2)).toBe("3");
    });
  });

  describe("decimal with comma (Norwegian)", () => {
    it("scales 1,5 × 2", () => {
      expect(scaleQuantity("1,5", 2)).toBe("3");
    });
    it("scales 2,5 × 2", () => {
      expect(scaleQuantity("2,5", 2)).toBe("5");
    });
  });

  describe("fractions", () => {
    it("scales 1/2 × 2", () => {
      expect(scaleQuantity("1/2", 2)).toBe("1");
    });
    it("scales 1/2 × 1 (no change)", () => {
      expect(scaleQuantity("1/2", 1)).toBe("0,5");
    });
    it("scales 3/4 × 2", () => {
      expect(scaleQuantity("3/4", 2)).toBe("1,5");
    });
    it("handles malformed fraction gracefully", () => {
      expect(scaleQuantity("1/2/3", 2)).toBe("1/2/3");
    });
    it("handles zero denominator", () => {
      expect(scaleQuantity("1/0", 2)).toBe("1/0");
    });
  });

  describe("quantity with unit suffix", () => {
    it("scales '400 g' × 2", () => {
      expect(scaleQuantity("400 g", 2)).toBe("800 g");
    });
    it("scales '1,5 dl' × 2", () => {
      expect(scaleQuantity("1,5 dl", 2)).toBe("3 dl");
    });
    it("scales '1/2 ts' × 2", () => {
      expect(scaleQuantity("1/2 ts", 2)).toBe("1 ts");
    });
    it("scales '2 ss' × 0.5", () => {
      expect(scaleQuantity("2 ss", 0.5)).toBe("1 ss");
    });
  });

  describe("quantity with compound suffix", () => {
    it("preserves multi-word suffix", () => {
      expect(scaleQuantity("400 g hermetiske tomater", 2)).toBe("800 g hermetiske tomater");
    });
  });

  describe("factor of 1 (no change)", () => {
    it("returns same value for integer", () => {
      expect(scaleQuantity("3", 1)).toBe("3");
    });
    it("returns same value for decimal", () => {
      expect(scaleQuantity("1,5 dl", 1)).toBe("1,5 dl");
    });
  });
});

// =============================================================================
// defaultServings
// =============================================================================
describe("defaultServings", () => {
  it("uses household_size for dinner recipes", () => {
    expect(defaultServings("dinner", 4, 6)).toBe(6);
  });
  it("falls back to recipe servings when household_size is null (dinner)", () => {
    expect(defaultServings("dinner", 4, null)).toBe(4);
  });
  it("falls back to 4 when both are null (dinner)", () => {
    expect(defaultServings("dinner", null, null)).toBe(4);
  });
  it("uses recipe servings for base recipes regardless of household_size", () => {
    expect(defaultServings("base", 2, 6)).toBe(2);
  });
  it("uses recipe servings for diy recipes", () => {
    expect(defaultServings("diy", 1, 6)).toBe(1);
  });
  it("falls back to 1 for non-dinner with null servings", () => {
    expect(defaultServings("base", null, 6)).toBe(1);
  });
});
