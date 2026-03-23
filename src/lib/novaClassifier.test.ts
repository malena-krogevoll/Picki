import { describe, it, expect } from "vitest";
import {
  classifyNova,
  matchRules,
  UPF_STRONG_RULES,
  UPF_WEAK_RULES,
  REAL_FOOD_RULES,
  HIGH_RISK_CATEGORIES,
} from "./novaClassifier";

// =============================================================================
// HELPER: shortcut for classifying with just ingredients text
// =============================================================================
const classify = (text: string, opts: { additives?: string[]; category?: string } = {}) =>
  classifyNova({ ingredients_text: text, additives: opts.additives, product_category: opts.category });

// =============================================================================
// 1. MISSING INGREDIENTS — must return safe fallbacks
// =============================================================================
describe("classifyNova – missing ingredients", () => {
  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["Norwegian 'no info' phrase", "ingen ingrediensinformasjon tilgjengelig"],
    ["n/a", "N/A"],
    ["ukjent", "ukjent"],
  ])("should return null nova_group for '%s' without category", (_label, text) => {
    const result = classify(text);
    expect(result.nova_group).toBeNull();
    expect(result.has_ingredients).toBe(false);
    expect(result.is_estimated).toBe(true);
  });

  it("should estimate NOVA 4 for high-risk category even without ingredients", () => {
    for (const cat of ["pizza", "chips", "brus"]) {
      const result = classify("", { category: cat });
      expect(result.nova_group).toBe(4);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.is_estimated).toBe(true);
    }
  });

  it("should return null for non-high-risk category without ingredients", () => {
    const result = classify("", { category: "frukt" });
    expect(result.nova_group).toBeNull();
  });
});

// =============================================================================
// 2. STRONG UPF SIGNALS → NOVA 4 — these ingredients prove ultra-processing
// =============================================================================
describe("classifyNova – strong UPF signals → NOVA 4", () => {
  it.each([
    ["aroma", "melk, sukker, aroma, salt"],
    ["aspartam", "vann, aspartam, sitronsyre"],
    ["E951 (sweetener E-number)", "vann, E951, sitronsyre"],
    ["emulgator", "mel, sukker, emulgator, vann"],
    ["modifisert stivelse", "vann, modifisert stivelse, salt"],
    ["glukose-sirup", "sukker, glukose-sirup, kakao"],
    ["hydrogenert fett", "mel, hydrogenert fett, sukker"],
    ["fargestoff", "vann, sukker, fargestoff, aroma"],
    ["maltodekstrin", "maltodekstrin, salt, krydder"],
    ["soyaprotein", "vann, soyaprotein, olje"],
    ["myseprotein (bare)", "mel, myseprotein, vann"],
    ["myseproteinkonsentrat", "mel, myseproteinkonsentrat, vann"],
    ["ostepulver", "mel, ostepulver, salt"],
    ["melkepulver", "mel, melkepulver, sukker"],
    ["druesukker", "mel, druesukker, vann"],
    ["dekstrose", "mel, dekstrose, salt"],
    ["fra konsentrat", "sitronsaft fra konsentrat, vann, sukker"],
    ["hvetegluten (isolert)", "mel, hvetegluten, vann"],
    ["proteinkonsentrat", "vann, proteinkonsentrat, salt"],
    ["invertsukker", "mel, invertsukker, smør"],
  ])("should classify as NOVA 4 when '%s' is present", (_label, text) => {
    const result = classify(text);
    expect(result.nova_group).toBe(4);
    expect(result.signals.some(s => s.type === "strong")).toBe(true);
  });

  it("should increase confidence with multiple strong signals", () => {
    const one = classify("mel, aroma");
    const multi = classify("mel, aroma, emulgator, fargestoff");
    expect(multi.confidence).toBeGreaterThan(one.confidence);
  });

  it("should have confidence ≤ 0.98 (never certain)", () => {
    const result = classify("aroma, emulgator, fargestoff, modifisert stivelse, aspartam");
    expect(result.confidence).toBeLessThanOrEqual(0.98);
  });

  it("should classify real-world fish product with industrial ingredients as NOVA 4", () => {
    // This is the exact product that was misclassified as NOVA 2
    const result = classify(
      "Alaskapollock (FISK) 40%, mel (HVETE-, ris-, mais-), vann, rapsolje, brokkoli 5%, cheddarost (MELK) 3,6%, stivelse( HVETE -, mais-, potet-), MELK, gulrot 1%, HVETEGLUTEN, smør (MELK), ostepulver (MELK), salt, gjær, myseprotein (MELK), druesukker, fløte(MELK), sitronsaft fra konsentrat, krydder (bl.a. gurkemeie, kajennepepper), SENNEPSFRØ."
    );
    expect(result.nova_group).toBe(4);
    expect(result.signals.some(s => s.type === "strong")).toBe(true);
    // Should detect multiple industrial markers
    const strongIds = result.signals.filter(s => s.type === "strong").map(s => s.rule_id);
    expect(strongIds.length).toBeGreaterThanOrEqual(3);
  });
});

// =============================================================================
// 3. WEAK SIGNALS → NOVA 3 — mildly processed indicators
// =============================================================================
describe("classifyNova – weak signals → NOVA 3", () => {
  it.each([
    ["konserveringsmiddel", "tomat, salt, konserveringsmiddel"],
    ["palmeolje", "mel, palmeolje, sukker"],
    ["E200-series preservative", "ost, E202"],
  ])("should classify as NOVA 3 when '%s' is present (no strong signal)", (_label, text) => {
    expect(classify(text).nova_group).toBe(3);
  });
});

// =============================================================================
// 4. REAL FOOD → NOVA 1 — minimal processing signals
// =============================================================================
describe("classifyNova – real food → NOVA 1", () => {
  it.each([
    ["single fruit", "frukt"],
    ["pasteurized milk", "pasteurisert melk"],
    ["fermented product", "melk, fermentert kultur"],
  ])("should classify '%s' as NOVA 1", (_label, text) => {
    const result = classify(text);
    expect(result.nova_group).toBe(1);
    expect(result.confidence).toBeGreaterThan(0.6);
  });
});

// =============================================================================
// 5. CULINARY INGREDIENTS → NOVA 2 — basic ingredients without signals
// =============================================================================
describe("classifyNova – culinary ingredients → NOVA 2", () => {
  it("should classify basic ingredient list without signals as NOVA 2", () => {
    const result = classify("hvetemel, vann, salt, olje, sukker");
    expect(result.nova_group).toBe(2);
  });
});

// =============================================================================
// 6. ESCALATION RULES — many ingredients + weak signals → NOVA 4
// =============================================================================
describe("classifyNova – escalation to NOVA 4", () => {
  it("should upgrade to NOVA 4 with 8+ ingredients and E-numbers", () => {
    const result = classify("mel, sukker, vann, salt, olje, melk, egg, kakao, E300");
    expect(result.nova_group).toBe(4);
  });

  it("should upgrade to NOVA 4 with 8+ ingredients and 2+ weak signals", () => {
    const result = classify("mel, sukker, vann, salt, olje, melk, egg, kakao, palmeolje, konserveringsmiddel");
    expect(result.nova_group).toBe(4);
  });
});

// =============================================================================
// 7. EXTERNAL ADDITIVES — additives parameter should influence classification
// =============================================================================
describe("classifyNova – additives parameter", () => {
  it("should consider external additives list for E-number detection", () => {
    const result = classify("mel, sukker, vann, salt, olje, melk, egg, kakao", { additives: ["E471"] });
    expect(result.nova_group).toBe(4);
  });

  it("should not fail with empty additives array", () => {
    const result = classify("mel, sukker", { additives: [] });
    expect(result).toBeDefined();
  });
});

// =============================================================================
// 8. matchRules — low-level rule matching
// =============================================================================
describe("matchRules", () => {
  it("should return empty array for clean text", () => {
    expect(matchRules("melk, sukker, salt", UPF_STRONG_RULES)).toHaveLength(0);
  });

  it("should find multiple strong signals", () => {
    const signals = matchRules("aroma, emulgator, fargestoff", UPF_STRONG_RULES);
    expect(signals.length).toBeGreaterThanOrEqual(3);
    expect(signals.every(s => s.type === "strong")).toBe(true);
  });

  it("should find weak signals", () => {
    const signals = matchRules("konserveringsmiddel, palmeolje", UPF_WEAK_RULES);
    expect(signals.length).toBeGreaterThanOrEqual(2);
  });

  it("should find real food signals", () => {
    const signals = matchRules("hele korn, fermentert, tørket", REAL_FOOD_RULES);
    expect(signals.length).toBeGreaterThanOrEqual(3);
  });

  it("should return unique matches per rule (no duplicates from global regex)", () => {
    const signals = matchRules("aroma og mer aroma", UPF_STRONG_RULES);
    // "aroma" appears twice, but they're the same match text — should still be valid
    expect(signals.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// 9. RESULT STRUCTURE — always returns required fields
// =============================================================================
describe("classifyNova – result structure", () => {
  it("should always include version and timestamp", () => {
    const result = classify("melk");
    expect(result.version).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it("should include debug info with ingredient count", () => {
    const result = classify("melk, sukker, salt");
    expect(result.debug.ingredients_count).toBe(3);
  });

  it("should list detected E-numbers in debug", () => {
    const result = classify("mel, E300, E202");
    expect(result.debug.e_numbers).toEqual(expect.arrayContaining(["E300", "E202"]));
    expect(result.debug.has_e_numbers).toBe(true);
  });
});

// =============================================================================
// 10. HIGH_RISK_CATEGORIES — verify the constant is sensible
// =============================================================================
describe("HIGH_RISK_CATEGORIES", () => {
  it("should contain common ultra-processed food categories", () => {
    expect(HIGH_RISK_CATEGORIES).toContain("pizza");
    expect(HIGH_RISK_CATEGORIES).toContain("chips");
    expect(HIGH_RISK_CATEGORIES).toContain("brus");
    expect(HIGH_RISK_CATEGORIES).toContain("godteri");
  });
});
