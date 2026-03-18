import { describe, it, expect } from "vitest";
import { classifyNova, matchRules, UPF_STRONG_RULES, UPF_WEAK_RULES, REAL_FOOD_RULES } from "./novaClassifier";

describe("classifyNova - missing ingredients", () => {
  it("returns null for empty ingredients", () => {
    const result = classifyNova({ ingredients_text: "" });
    expect(result.nova_group).toBeNull();
    expect(result.has_ingredients).toBe(false);
    expect(result.is_estimated).toBe(true);
  });

  it("estimates NOVA 4 for high-risk category without ingredients", () => {
    const result = classifyNova({ ingredients_text: "", product_category: "pizza" });
    expect(result.nova_group).toBe(4);
    expect(result.is_estimated).toBe(true);
    expect(result.confidence).toBeLessThan(0.3);
  });

  it("returns null for non-high-risk category without ingredients", () => {
    const result = classifyNova({ ingredients_text: "", product_category: "frukt" });
    expect(result.nova_group).toBeNull();
  });

  it("treats 'ingen ingrediensinformasjon' as missing", () => {
    const result = classifyNova({ ingredients_text: "ingen ingrediensinformasjon tilgjengelig" });
    expect(result.has_ingredients).toBe(false);
  });
});

describe("classifyNova - strong UPF signals → NOVA 4", () => {
  it("detects aroma", () => {
    const result = classifyNova({ ingredients_text: "melk, sukker, aroma, salt" });
    expect(result.nova_group).toBe(4);
    expect(result.signals.some(s => s.type === "strong")).toBe(true);
  });

  it("detects artificial sweetener (aspartam)", () => {
    const result = classifyNova({ ingredients_text: "vann, aspartam, sitronsyre" });
    expect(result.nova_group).toBe(4);
  });

  it("detects E-number sweetener", () => {
    const result = classifyNova({ ingredients_text: "vann, E951, sitronsyre" });
    expect(result.nova_group).toBe(4);
  });

  it("detects emulgator", () => {
    const result = classifyNova({ ingredients_text: "mel, sukker, emulgator, vann" });
    expect(result.nova_group).toBe(4);
  });

  it("detects modifisert stivelse", () => {
    const result = classifyNova({ ingredients_text: "vann, modifisert stivelse, salt" });
    expect(result.nova_group).toBe(4);
  });

  it("detects glukosesirup", () => {
    const result = classifyNova({ ingredients_text: "sukker, glukose-sirup, kakao" });
    expect(result.nova_group).toBe(4);
  });

  it("detects hydrogenert fett", () => {
    const result = classifyNova({ ingredients_text: "mel, hydrogenert fett, sukker" });
    expect(result.nova_group).toBe(4);
  });

  it("increases confidence with multiple strong signals", () => {
    const one = classifyNova({ ingredients_text: "mel, aroma" });
    const multi = classifyNova({ ingredients_text: "mel, aroma, emulgator, fargestoff" });
    expect(multi.confidence).toBeGreaterThan(one.confidence);
  });
});

describe("classifyNova - weak signals → NOVA 3", () => {
  it("detects konserveringsmiddel", () => {
    const result = classifyNova({ ingredients_text: "tomat, salt, konserveringsmiddel" });
    expect(result.nova_group).toBe(3);
  });

  it("detects palmeolje", () => {
    const result = classifyNova({ ingredients_text: "mel, palmeolje, sukker" });
    expect(result.nova_group).toBe(3);
  });

  it("detects E200-series", () => {
    const result = classifyNova({ ingredients_text: "ost, E202" });
    expect(result.nova_group).toBe(3);
  });
});

describe("classifyNova - real food → NOVA 1", () => {
  it("classifies simple fruit as NOVA 1", () => {
    const result = classifyNova({ ingredients_text: "frukt" });
    expect(result.nova_group).toBe(1);
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it("classifies pasteurisert melk as NOVA 1", () => {
    const result = classifyNova({ ingredients_text: "pasteurisert melk" });
    expect(result.nova_group).toBe(1);
  });

  it("classifies fermented product as NOVA 1", () => {
    const result = classifyNova({ ingredients_text: "melk, fermentert kultur" });
    expect(result.nova_group).toBe(1);
  });
});

describe("classifyNova - NOVA 2 (culinary ingredients)", () => {
  it("classifies plain ingredient list without signals as NOVA 2", () => {
    const result = classifyNova({ ingredients_text: "hvetemel, vann, salt, olje, sukker" });
    expect(result.nova_group).toBe(2);
  });
});

describe("classifyNova - many ingredients + weak signals → NOVA 4", () => {
  it("upgrades to NOVA 4 with 8+ ingredients and E-numbers", () => {
    const result = classifyNova({
      ingredients_text: "mel, sukker, vann, salt, olje, melk, egg, kakao, E300"
    });
    expect(result.nova_group).toBe(4);
  });
});

describe("classifyNova - additives parameter", () => {
  it("considers external additives list", () => {
    const result = classifyNova({
      ingredients_text: "mel, sukker, vann, salt, olje, melk, egg, kakao",
      additives: ["E471"]
    });
    expect(result.nova_group).toBe(4);
  });
});

describe("matchRules", () => {
  it("returns empty for clean text", () => {
    const signals = matchRules("melk, sukker, salt", UPF_STRONG_RULES);
    expect(signals).toHaveLength(0);
  });

  it("finds multiple strong signals", () => {
    const signals = matchRules("aroma, emulgator, fargestoff", UPF_STRONG_RULES);
    expect(signals.length).toBeGreaterThanOrEqual(3);
  });

  it("finds weak signals", () => {
    const signals = matchRules("konserveringsmiddel, palmeolje", UPF_WEAK_RULES);
    expect(signals.length).toBeGreaterThanOrEqual(2);
  });

  it("finds real food signals", () => {
    const signals = matchRules("hele korn, fermentert, tørket", REAL_FOOD_RULES);
    expect(signals.length).toBeGreaterThanOrEqual(3);
  });
});
