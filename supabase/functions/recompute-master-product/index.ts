import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with service role for DB writes
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Source priority (higher index = higher priority)
type SourceType = "KASSALAPP" | "MANUAL" | "EPD";

const SOURCE_PRIORITY: Record<SourceType, number> = {
  KASSALAPP: 1,
  MANUAL: 2,
  EPD: 3,
};

// Field-specific priority overrides
// Format: { fieldName: [highest priority source, ..., lowest priority source] }
const FIELD_PRIORITY: Record<string, SourceType[]> = {
  ingredients_raw: ["EPD", "MANUAL", "KASSALAPP"],
  image_url: ["EPD", "KASSALAPP", "MANUAL"],
  name: ["EPD", "MANUAL", "KASSALAPP"],
  brand: ["EPD", "MANUAL", "KASSALAPP"],
};

interface ProductSource {
  id: string;
  ean: string;
  source: SourceType;
  source_product_id: string | null;
  payload: Record<string, unknown>;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  ingredients_raw: string | null;
  fetched_at: string;
}

interface MasterProduct {
  ean: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  ingredients_raw: string | null;
  ingredients_hash: string | null;
  updated_at: string;
}

// Generate SHA-256 hash of ingredients for cache invalidation
async function hashIngredients(ingredients: string | null): Promise<string | null> {
  if (!ingredients) return null;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(ingredients.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
}

// Get the best value for a field based on priority
function getBestFieldValue<T>(
  sources: ProductSource[],
  fieldName: keyof ProductSource,
  priorityOrder: SourceType[]
): T | null {
  // Sort sources by priority for this field (highest first)
  const sortedSources = [...sources].sort((a, b) => {
    const priorityA = priorityOrder.indexOf(a.source);
    const priorityB = priorityOrder.indexOf(b.source);
    // Lower index = higher priority, -1 means not in list (lowest priority)
    const effectiveA = priorityA === -1 ? 999 : priorityA;
    const effectiveB = priorityB === -1 ? 999 : priorityB;
    return effectiveA - effectiveB;
  });

  // Find first non-null/non-empty value
  for (const source of sortedSources) {
    const value = source[fieldName];
    if (value !== null && value !== undefined && value !== "") {
      return value as T;
    }
  }

  return null;
}

// Main function to recompute master product from sources
async function recomputeMasterProduct(ean: string): Promise<{
  success: boolean;
  product?: MasterProduct;
  error?: string;
  sourcesUsed?: string[];
}> {
  console.log(`Recomputing master product for EAN: ${ean}`);

  // 1. Fetch all product_sources for this EAN
  const { data: sources, error: fetchError } = await supabase
    .from("product_sources")
    .select("*")
    .eq("ean", ean);

  if (fetchError) {
    console.error("Error fetching product_sources:", fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!sources || sources.length === 0) {
    console.log(`No product_sources found for EAN: ${ean}`);
    return { success: false, error: `No sources found for EAN: ${ean}` };
  }

  console.log(`Found ${sources.length} sources: ${sources.map(s => s.source).join(", ")}`);

  // 2. Apply field-specific priority to select best values
  const name = getBestFieldValue<string>(sources, "name", FIELD_PRIORITY.name);
  const brand = getBestFieldValue<string>(sources, "brand", FIELD_PRIORITY.brand);
  const image_url = getBestFieldValue<string>(sources, "image_url", FIELD_PRIORITY.image_url);
  const ingredients_raw = getBestFieldValue<string>(sources, "ingredients_raw", FIELD_PRIORITY.ingredients_raw);

  // 3. Generate ingredients hash
  const ingredients_hash = await hashIngredients(ingredients_raw);

  // 4. Build the master product record
  const masterProduct: MasterProduct = {
    ean,
    name,
    brand,
    image_url,
    ingredients_raw,
    ingredients_hash,
    updated_at: new Date().toISOString(),
  };

  console.log("Computed master product:", {
    ean,
    name: name?.substring(0, 50),
    brand,
    hasImage: !!image_url,
    hasIngredients: !!ingredients_raw,
    ingredientsHash: ingredients_hash?.substring(0, 16),
  });

  // 5. Upsert into products table
  const { data: upsertedProduct, error: upsertError } = await supabase
    .from("products")
    .upsert(masterProduct, {
      onConflict: "ean",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (upsertError) {
    console.error("Error upserting product:", upsertError);
    return { success: false, error: upsertError.message };
  }

  console.log(`Successfully upserted master product for EAN: ${ean}`);

  return {
    success: true,
    product: upsertedProduct,
    sourcesUsed: sources.map(s => s.source),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ean } = await req.json();

    if (!ean || typeof ean !== "string") {
      return new Response(
        JSON.stringify({ error: "EAN is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await recomputeMasterProduct(ean.trim());

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        product: result.product,
        sourcesUsed: result.sourcesUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recompute-master-product:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
