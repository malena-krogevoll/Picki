/**
 * Pure business logic extracted from useShoppingList for testability.
 * These functions handle data parsing, validation, and transformation
 * without any Supabase or React dependencies.
 */

import type { Json } from "@/integrations/supabase/types";

// =============================================================================
// TYPES
// =============================================================================

export interface ProductData {
  ean: string;
  name: string;
  brand: string;
  price: number | null;
  image: string;
  novaScore: number | null;
  isEstimated?: boolean;
  store: string;
  ingredients?: string;
  allergenInfo?: string;
  filters?: string;
}

export interface ShoppingListItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  notes: string | null;
  selected_product_ean: string | null;
  product_data: ProductData | null;
  in_cart: boolean;
  created_at: string;
}

// =============================================================================
// parseProductData — safely converts untyped JSON from Supabase to ProductData
// This is critical because product_data is a JSONB column with no schema enforcement.
// Any malformed data must NOT crash the app.
// =============================================================================

export function parseProductData(data: Json | null | undefined): ProductData | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const obj = data as Record<string, Json | undefined>;

  return {
    ean: String(obj.ean || ""),
    name: String(obj.name || ""),
    brand: String(obj.brand || ""),
    price: typeof obj.price === "number" ? obj.price : null,
    image: String(obj.image || ""),
    novaScore: typeof obj.novaScore === "number" ? obj.novaScore : null,
    isEstimated: Boolean(obj.isEstimated),
    store: String(obj.store || ""),
    ingredients: obj.ingredients ? String(obj.ingredients) : undefined,
    allergenInfo: obj.allergenInfo ? String(obj.allergenInfo) : undefined,
    filters: obj.filters ? String(obj.filters) : undefined,
  };
}

// =============================================================================
// productDataToJson — converts typed ProductData back to a Supabase-safe Json value.
// Used when inserting/updating shopping_list_items.
// =============================================================================

export function productDataToJson(productData: ProductData): Json {
  return {
    ean: productData.ean,
    name: productData.name,
    brand: productData.brand,
    price: productData.price,
    image: productData.image,
    novaScore: productData.novaScore,
    isEstimated: productData.isEstimated ?? false,
    store: productData.store,
    ingredients: productData.ingredients ?? null,
    allergenInfo: productData.allergenInfo ?? null,
    filters: productData.filters ?? null,
  } as Json;
}

// =============================================================================
// sanitizeQuantity — enforces minimum quantity of 1.
// Used in addItem, updateItemQuantity, and duplicate operations.
// =============================================================================

export function sanitizeQuantity(quantity: unknown): number {
  if (typeof quantity !== "number" || isNaN(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

// =============================================================================
// mapDbItemToShoppingListItem — maps a single raw DB row to a typed ShoppingListItem.
// Handles missing/null fields gracefully with safe defaults.
// =============================================================================

export function mapDbItemToShoppingListItem(dbItem: Record<string, unknown>): ShoppingListItem {
  return {
    id: String(dbItem.id || ""),
    list_id: String(dbItem.list_id || ""),
    name: String(dbItem.name || ""),
    quantity: sanitizeQuantity(dbItem.quantity),
    notes: dbItem.notes != null ? String(dbItem.notes) : null,
    selected_product_ean: dbItem.selected_product_ean != null ? String(dbItem.selected_product_ean) : null,
    product_data: parseProductData(dbItem.product_data as Json | null),
    in_cart: Boolean(dbItem.in_cart),
    created_at: String(dbItem.created_at || ""),
  };
}

// =============================================================================
// mapDbItemsToShoppingListItems — batch version of the above.
// =============================================================================

export function mapDbItemsToShoppingListItems(items: Record<string, unknown>[]): ShoppingListItem[] {
  return items.map(mapDbItemToShoppingListItem);
}

// =============================================================================
// prepareDuplicateItems — creates insert-ready items for list duplication.
// Business rule: duplicated items reset in_cart and product_data (new store context).
// =============================================================================

export function prepareDuplicateItems(
  originalItems: Array<{ name: string; quantity?: number; notes?: string | null }>,
  newListId: string
): Array<{ list_id: string; name: string; quantity: number; notes: string | null; in_cart: boolean }> {
  return originalItems.map((item) => ({
    list_id: newListId,
    name: item.name,
    quantity: sanitizeQuantity(item.quantity),
    notes: item.notes ?? null,
    in_cart: false,
  }));
}

// =============================================================================
// mergeRecipeIngredients — merges recipe ingredients into existing list items.
// Business rule: if an ingredient with the same name (case-insensitive) already
// exists in the list, increase its quantity instead of creating a duplicate.
// Returns: { toInsert: new items, toUpdate: existing items with updated quantities }
// =============================================================================

export interface MergeResult {
  toInsert: Array<{ name: string; quantity: number; notes: string | null }>;
  toUpdate: Array<{ id: string; quantity: number }>;
}

export function mergeRecipeIngredients(
  existingItems: Array<{ id: string; name: string; quantity: number }>,
  newIngredients: Array<{ name: string; quantity?: number; notes?: string | null }>
): MergeResult {
  const toInsert: MergeResult["toInsert"] = [];
  const toUpdate: MergeResult["toUpdate"] = [];

  // Build a case-insensitive lookup of existing items
  const existingMap = new Map<string, { id: string; quantity: number }>();
  for (const item of existingItems) {
    existingMap.set(item.name.toLowerCase().trim(), { id: item.id, quantity: item.quantity });
  }

  for (const ingredient of newIngredients) {
    const key = ingredient.name.toLowerCase().trim();
    if (!key) continue;

    const existing = existingMap.get(key);
    if (existing) {
      const addedQty = sanitizeQuantity(ingredient.quantity);
      toUpdate.push({ id: existing.id, quantity: existing.quantity + addedQty });
      // Update the map so subsequent duplicates in newIngredients stack correctly
      existingMap.set(key, { id: existing.id, quantity: existing.quantity + addedQty });
    } else {
      toInsert.push({
        name: ingredient.name.trim(),
        quantity: sanitizeQuantity(ingredient.quantity),
        notes: ingredient.notes ?? null,
      });
      // Add to map so duplicates within newIngredients are merged
      existingMap.set(key, { id: `new-${toInsert.length}`, quantity: sanitizeQuantity(ingredient.quantity) });
    }
  }

  return { toInsert, toUpdate };
}
