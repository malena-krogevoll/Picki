import { describe, it, expect } from "vitest";
import {
  parseProductData,
  productDataToJson,
  sanitizeQuantity,
  mapDbItemToShoppingListItem,
  mapDbItemsToShoppingListItems,
  prepareDuplicateItems,
  mergeRecipeIngredients,
} from "./shoppingListUtils";

// =============================================================================
// 1. parseProductData — safety-critical JSON → ProductData conversion
//    Malformed JSONB from Supabase must never crash the app.
// =============================================================================
describe("parseProductData", () => {
  it("should parse a complete valid product object", () => {
    const input = {
      ean: "7038010000",
      name: "Tine Lettmelk",
      brand: "Tine",
      price: 22.9,
      image: "https://img.example.com/milk.jpg",
      novaScore: 1,
      isEstimated: false,
      store: "REMA_1000",
      ingredients: "melk",
      allergenInfo: "Melk",
      filters: "Laktose",
    };
    const result = parseProductData(input);
    expect(result).toEqual({
      ean: "7038010000",
      name: "Tine Lettmelk",
      brand: "Tine",
      price: 22.9,
      image: "https://img.example.com/milk.jpg",
      novaScore: 1,
      isEstimated: false,
      store: "REMA_1000",
      ingredients: "melk",
      allergenInfo: "Melk",
      filters: "Laktose",
    });
  });

  it("should return null for null input", () => {
    expect(parseProductData(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(parseProductData(undefined)).toBeNull();
  });

  it("should return null for array input (JSONB can be an array)", () => {
    expect(parseProductData([1, 2, 3])).toBeNull();
  });

  it("should return null for primitive values", () => {
    expect(parseProductData("string" as any)).toBeNull();
    expect(parseProductData(42 as any)).toBeNull();
    expect(parseProductData(true as any)).toBeNull();
  });

  it("should handle empty object with safe defaults", () => {
    const result = parseProductData({});
    expect(result).toEqual({
      ean: "",
      name: "",
      brand: "",
      price: null,
      image: "",
      novaScore: null,
      isEstimated: false,
      store: "",
      ingredients: undefined,
      allergenInfo: undefined,
      filters: undefined,
    });
  });

  it("should coerce non-string fields to strings where expected", () => {
    const result = parseProductData({ ean: 7038010000, name: 123 } as any);
    expect(result!.ean).toBe("7038010000");
    expect(result!.name).toBe("123");
  });

  it("should return price as null when price is a string", () => {
    const result = parseProductData({ price: "22.90" } as any);
    expect(result!.price).toBeNull();
  });

  it("should return novaScore as null when novaScore is a string", () => {
    const result = parseProductData({ novaScore: "4" } as any);
    expect(result!.novaScore).toBeNull();
  });

  it("should handle price = 0 correctly (not null)", () => {
    const result = parseProductData({ price: 0 });
    expect(result!.price).toBe(0);
  });

  it("should handle novaScore = 0 correctly", () => {
    const result = parseProductData({ novaScore: 0 });
    expect(result!.novaScore).toBe(0);
  });

  it("should not include optional fields when they are falsy/missing", () => {
    const result = parseProductData({ ean: "123" });
    expect(result!.ingredients).toBeUndefined();
    expect(result!.allergenInfo).toBeUndefined();
    expect(result!.filters).toBeUndefined();
  });
});

// =============================================================================
// 2. productDataToJson — round-trip safety
// =============================================================================
describe("productDataToJson", () => {
  it("should produce a JSON-safe object from ProductData", () => {
    const input = {
      ean: "123",
      name: "Test",
      brand: "Brand",
      price: 10,
      image: "",
      novaScore: 2,
      store: "KIWI",
    };
    const result = productDataToJson(input);
    expect(result).toEqual(
      expect.objectContaining({ ean: "123", name: "Test", price: 10, novaScore: 2 })
    );
  });

  it("should set null for undefined optional fields (Supabase JSONB requirement)", () => {
    const result = productDataToJson({
      ean: "",
      name: "",
      brand: "",
      price: null,
      image: "",
      novaScore: null,
      store: "",
    }) as Record<string, unknown>;
    expect(result.ingredients).toBeNull();
    expect(result.allergenInfo).toBeNull();
    expect(result.filters).toBeNull();
  });

  it("should round-trip through parseProductData → productDataToJson", () => {
    const original = {
      ean: "7038010000",
      name: "Melk",
      brand: "Tine",
      price: 22.9,
      image: "img.jpg",
      novaScore: 1,
      isEstimated: false,
      store: "REMA_1000",
      ingredients: "melk",
      allergenInfo: "Melk",
      filters: "Laktose",
    };
    const json = productDataToJson(original);
    const parsed = parseProductData(json);
    expect(parsed).toEqual(original);
  });
});

// =============================================================================
// 3. sanitizeQuantity — enforces business rule: quantity ≥ 1, integer
// =============================================================================
describe("sanitizeQuantity", () => {
  it.each([
    [5, 5],
    [1, 1],
    [0, 1],       // minimum is 1
    [-3, 1],      // negative → 1
    [2.7, 2],     // floor decimal
    [1.1, 1],
  ])("should sanitize %s → %s", (input, expected) => {
    expect(sanitizeQuantity(input)).toBe(expected);
  });

  it.each([
    [null, 1],
    [undefined, 1],
    ["3", 1],     // string is not a number
    [NaN, 1],
    [{}, 1],
  ])("should return 1 for non-numeric input %s", (input, expected) => {
    expect(sanitizeQuantity(input)).toBe(expected);
  });
});

// =============================================================================
// 4. mapDbItemToShoppingListItem — DB row → typed item
// =============================================================================
describe("mapDbItemToShoppingListItem", () => {
  it("should map a complete DB row correctly", () => {
    const dbItem = {
      id: "abc-123",
      list_id: "list-456",
      name: "Melk",
      quantity: 2,
      notes: "Lettmelk",
      selected_product_ean: "7038010000",
      product_data: { ean: "7038010000", name: "Tine Lettmelk", brand: "Tine", price: 22.9, image: "", novaScore: 1, store: "REMA_1000" },
      in_cart: true,
      created_at: "2025-01-01T00:00:00Z",
    };

    const result = mapDbItemToShoppingListItem(dbItem);
    expect(result.id).toBe("abc-123");
    expect(result.name).toBe("Melk");
    expect(result.quantity).toBe(2);
    expect(result.notes).toBe("Lettmelk");
    expect(result.in_cart).toBe(true);
    expect(result.product_data?.ean).toBe("7038010000");
  });

  it("should handle missing/null fields with safe defaults", () => {
    const result = mapDbItemToShoppingListItem({});
    expect(result.id).toBe("");
    expect(result.name).toBe("");
    expect(result.quantity).toBe(1);
    expect(result.notes).toBeNull();
    expect(result.selected_product_ean).toBeNull();
    expect(result.product_data).toBeNull();
    expect(result.in_cart).toBe(false);
  });

  it("should sanitize invalid quantity from DB", () => {
    const result = mapDbItemToShoppingListItem({ quantity: -5 });
    expect(result.quantity).toBe(1);
  });
});

// =============================================================================
// 5. mapDbItemsToShoppingListItems — batch mapping
// =============================================================================
describe("mapDbItemsToShoppingListItems", () => {
  it("should map multiple items", () => {
    const result = mapDbItemsToShoppingListItems([
      { id: "1", name: "Melk", quantity: 1 },
      { id: "2", name: "Brød", quantity: 2 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Melk");
    expect(result[1].name).toBe("Brød");
  });

  it("should return empty array for empty input", () => {
    expect(mapDbItemsToShoppingListItems([])).toEqual([]);
  });
});

// =============================================================================
// 6. prepareDuplicateItems — list duplication logic
//    Business rule: product_data and in_cart are always reset when duplicating.
// =============================================================================
describe("prepareDuplicateItems", () => {
  it("should create items with new list_id and reset in_cart", () => {
    const originals = [
      { name: "Melk", quantity: 2, notes: "Lett" },
      { name: "Brød", quantity: 1, notes: null },
    ];
    const result = prepareDuplicateItems(originals, "new-list-id");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      list_id: "new-list-id",
      name: "Melk",
      quantity: 2,
      notes: "Lett",
      in_cart: false,
    });
    expect(result[1].in_cart).toBe(false);
  });

  it("should sanitize missing quantity", () => {
    const result = prepareDuplicateItems([{ name: "Salt" }], "list-1");
    expect(result[0].quantity).toBe(1);
  });

  it("should return empty array for empty input", () => {
    expect(prepareDuplicateItems([], "list-1")).toEqual([]);
  });
});

// =============================================================================
// 7. mergeRecipeIngredients — deduplication when adding recipe to list
//    This is the most complex pure logic in the shopping list domain.
// =============================================================================
describe("mergeRecipeIngredients", () => {
  it("should insert new ingredients not in the existing list", () => {
    const result = mergeRecipeIngredients(
      [{ id: "1", name: "Melk", quantity: 1 }],
      [{ name: "Egg", quantity: 6 }]
    );
    expect(result.toInsert).toHaveLength(1);
    expect(result.toInsert[0]).toEqual({ name: "Egg", quantity: 6, notes: null });
    expect(result.toUpdate).toHaveLength(0);
  });

  it("should update quantity for existing items (case-insensitive match)", () => {
    const result = mergeRecipeIngredients(
      [{ id: "1", name: "Melk", quantity: 1 }],
      [{ name: "melk", quantity: 2 }]
    );
    expect(result.toInsert).toHaveLength(0);
    expect(result.toUpdate).toHaveLength(1);
    expect(result.toUpdate[0]).toEqual({ id: "1", quantity: 3 }); // 1 + 2
  });

  it("should handle mix of new and existing ingredients", () => {
    const result = mergeRecipeIngredients(
      [
        { id: "1", name: "Melk", quantity: 1 },
        { id: "2", name: "Egg", quantity: 6 },
      ],
      [
        { name: "Melk", quantity: 1 },  // exists → update
        { name: "Brød" },                // new → insert
        { name: "Egg", quantity: 2 },    // exists → update
      ]
    );
    expect(result.toInsert).toHaveLength(1);
    expect(result.toInsert[0].name).toBe("Brød");
    expect(result.toUpdate).toHaveLength(2);
    expect(result.toUpdate.find(u => u.id === "1")?.quantity).toBe(2); // 1 + 1
    expect(result.toUpdate.find(u => u.id === "2")?.quantity).toBe(8); // 6 + 2
  });

  it("should handle duplicates within new ingredients (stacking)", () => {
    const result = mergeRecipeIngredients(
      [],
      [
        { name: "Melk", quantity: 1 },
        { name: "melk", quantity: 2 }, // duplicate, should stack
      ]
    );
    // First "Melk" inserts, second "melk" updates the inserted one
    expect(result.toInsert).toHaveLength(1);
    expect(result.toInsert[0].name).toBe("Melk");
    expect(result.toInsert[0].quantity).toBe(1);
    // The second occurrence triggers an update to the "new" item
    expect(result.toUpdate).toHaveLength(1);
  });

  it("should skip empty ingredient names", () => {
    const result = mergeRecipeIngredients(
      [],
      [{ name: "", quantity: 1 }, { name: "  ", quantity: 1 }]
    );
    expect(result.toInsert).toHaveLength(0);
    expect(result.toUpdate).toHaveLength(0);
  });

  it("should trim whitespace in ingredient names for matching", () => {
    const result = mergeRecipeIngredients(
      [{ id: "1", name: "Melk", quantity: 1 }],
      [{ name: "  melk  ", quantity: 1 }]
    );
    expect(result.toUpdate).toHaveLength(1);
    expect(result.toInsert).toHaveLength(0);
  });

  it("should handle empty existing list (all inserts)", () => {
    const result = mergeRecipeIngredients(
      [],
      [{ name: "Melk" }, { name: "Egg" }, { name: "Brød" }]
    );
    expect(result.toInsert).toHaveLength(3);
    expect(result.toUpdate).toHaveLength(0);
  });

  it("should handle empty new ingredients (no-op)", () => {
    const result = mergeRecipeIngredients(
      [{ id: "1", name: "Melk", quantity: 1 }],
      []
    );
    expect(result.toInsert).toHaveLength(0);
    expect(result.toUpdate).toHaveLength(0);
  });

  it("should default missing quantity to 1", () => {
    const result = mergeRecipeIngredients(
      [],
      [{ name: "Salt" }]
    );
    expect(result.toInsert[0].quantity).toBe(1);
  });
});
