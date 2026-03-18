import { describe, it, expect } from "vitest";
import { getCountryFromEAN, getCountryInfo, countryCodeToFlag, extractCountryOfOrigin } from "./countryUtils";

describe("getCountryFromEAN", () => {
  it("detects Norwegian EAN (700-709)", () => {
    const result = getCountryFromEAN("7039010005012");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Norge");
    expect(result!.alpha2).toBe("NO");
  });

  it("detects Swedish EAN (730-739)", () => {
    const result = getCountryFromEAN("7310350000000");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Sverige");
  });

  it("detects Danish EAN (570-579)", () => {
    const result = getCountryFromEAN("5701234567890");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Danmark");
  });

  it("detects German EAN (400-440)", () => {
    const result = getCountryFromEAN("4001234567890");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Tyskland");
  });

  it("detects US EAN (000-019)", () => {
    const result = getCountryFromEAN("0012345678905");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("USA");
  });

  it("returns null for unknown prefix", () => {
    const result = getCountryFromEAN("9991234567890");
    expect(result).toBeNull();
  });

  it("returns null for short input", () => {
    expect(getCountryFromEAN("70")).toBeNull();
    expect(getCountryFromEAN("")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(getCountryFromEAN(null)).toBeNull();
    expect(getCountryFromEAN(undefined)).toBeNull();
  });

  it("handles numeric input", () => {
    const result = getCountryFromEAN(7039010005012);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Norge");
  });
});

describe("getCountryInfo", () => {
  it("looks up numeric country code", () => {
    const result = getCountryInfo("578");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Norge");
    expect(result!.flag).toBe("🇳🇴");
    expect(result!.alpha2).toBe("NO");
  });

  it("looks up alpha-2 code", () => {
    const result = getCountryInfo("SE");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Sverige");
  });

  it("is case-insensitive", () => {
    expect(getCountryInfo("no")).not.toBeNull();
    expect(getCountryInfo("No")).not.toBeNull();
  });

  it("returns null for unknown code", () => {
    expect(getCountryInfo("ZZ")).toBeNull();
    expect(getCountryInfo("999")).toBeNull();
  });
});

describe("countryCodeToFlag", () => {
  it("converts NO to Norwegian flag", () => {
    expect(countryCodeToFlag("NO")).toBe("🇳🇴");
  });

  it("converts SE to Swedish flag", () => {
    expect(countryCodeToFlag("SE")).toBe("🇸🇪");
  });

  it("returns empty for invalid length", () => {
    expect(countryCodeToFlag("")).toBe("");
    expect(countryCodeToFlag("NOR")).toBe("");
  });
});

describe("extractCountryOfOrigin", () => {
  it("extracts from direct countryOfOrigin field", () => {
    const result = extractCountryOfOrigin({ countryOfOrigin: "578" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Norge");
  });

  it("extracts from placeOfProductActivity", () => {
    const result = extractCountryOfOrigin({
      placeOfProductActivity: { countryOfOrigin: { countryCode: "752" } }
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Sverige");
  });

  it("extracts from array placeOfProductActivity", () => {
    const result = extractCountryOfOrigin({
      placeOfProductActivity: [
        { countryCode: "578" },
        { countryCode: "752" }
      ]
    });
    expect(result).toHaveLength(2);
  });

  it("deduplicates codes", () => {
    const result = extractCountryOfOrigin({
      countryOfOrigin: "578",
      country_of_origin: "578"
    });
    expect(result).toHaveLength(1);
  });

  it("returns empty for unknown payload", () => {
    expect(extractCountryOfOrigin({})).toHaveLength(0);
  });
});
