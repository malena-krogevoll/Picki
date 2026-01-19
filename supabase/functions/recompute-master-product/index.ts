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

interface ExistingProduct {
  ean: string;
  ingredients_hash: string | null;
  nova_class: number | null;
}

interface MasterProduct {
  ean: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  ingredients_raw: string | null;
  ingredients_hash: string | null;
  nova_class: number | null;
  nova_confidence: number | null;
  nova_reason: string | null;
  updated_at: string;
}

interface NovaClassificationResult {
  nova_group: 1 | 2 | 3 | 4 | null;
  confidence: number;
  reasoning: string;
  has_ingredients: boolean;
  is_estimated: boolean;
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

// Call the classify-nova edge function
async function classifyNova(ingredientsRaw: string, productCategory?: string): Promise<NovaClassificationResult | null> {
  try {
    const functionUrl = `${supabaseUrl}/functions/v1/classify-nova/classify-nova`;
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        ingredients_text: ingredientsRaw,
        product_category: productCategory,
      }),
    });

    if (!response.ok) {
      console.error(`NOVA classification failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    return result as NovaClassificationResult;
  } catch (error) {
    console.error("Error calling classify-nova:", error);
    return null;
  }
}

// Main function to recompute master product from sources
async function recomputeMasterProduct(ean: string): Promise<{
  success: boolean;
  product?: MasterProduct;
  error?: string;
  sourcesUsed?: string[];
  novaRecomputed?: boolean;
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

  // 2. Fetch existing product to check if NOVA needs recomputation
  const { data: existingProduct } = await supabase
    .from("products")
    .select("ean, ingredients_hash, nova_class")
    .eq("ean", ean)
    .maybeSingle();

  // 3. Apply field-specific priority to select best values
  const name = getBestFieldValue<string>(sources, "name", FIELD_PRIORITY.name);
  const brand = getBestFieldValue<string>(sources, "brand", FIELD_PRIORITY.brand);
  const image_url = getBestFieldValue<string>(sources, "image_url", FIELD_PRIORITY.image_url);
  const ingredients_raw = getBestFieldValue<string>(sources, "ingredients_raw", FIELD_PRIORITY.ingredients_raw);

  // 4. Generate ingredients hash
  const ingredients_hash = await hashIngredients(ingredients_raw);

  // 5. Determine if NOVA needs recomputation
  const oldHash = existingProduct?.ingredients_hash;
  const oldNovaClass = existingProduct?.nova_class;
  
  const needsNovaRecomputation = 
    oldNovaClass === null || 
    oldNovaClass === undefined || 
    (ingredients_hash !== null && ingredients_hash !== oldHash);

  console.log(`NOVA recomputation needed: ${needsNovaRecomputation} (oldHash: ${oldHash?.substring(0, 16) ?? 'null'}, newHash: ${ingredients_hash?.substring(0, 16) ?? 'null'}, oldNova: ${oldNovaClass})`);

  // 6. Compute NOVA if needed
  let nova_class: number | null = existingProduct?.nova_class ?? null;
  let nova_confidence: number | null = null;
  let nova_reason: string | null = null;

  if (needsNovaRecomputation && ingredients_raw) {
    console.log("Computing NOVA classification...");
    
    // Try to get product category from sources for better classification
    const payload = sources[0]?.payload as { category?: string } | undefined;
    const productCategory = payload?.category;
    
    const novaResult = await classifyNova(ingredients_raw, productCategory);
    
    if (novaResult) {
      nova_class = novaResult.nova_group;
      nova_confidence = novaResult.confidence;
      nova_reason = novaResult.reasoning;
      console.log(`NOVA classification result: NOVA ${nova_class} (confidence: ${nova_confidence})`);
    } else {
      console.warn("NOVA classification returned null, keeping existing values");
      // Keep existing values if classification fails
      if (!needsNovaRecomputation) {
        nova_class = existingProduct?.nova_class ?? null;
      }
    }
  } else if (!ingredients_raw) {
    console.log("No ingredients available, skipping NOVA classification");
  } else {
    console.log("Ingredients unchanged, using cached NOVA values");
    // Keep existing NOVA values since ingredients haven't changed
    // We need to fetch them if we don't have them
    if (existingProduct) {
      const { data: fullProduct } = await supabase
        .from("products")
        .select("nova_class, nova_confidence, nova_reason")
        .eq("ean", ean)
        .maybeSingle();
      
      if (fullProduct) {
        nova_class = fullProduct.nova_class;
        nova_confidence = fullProduct.nova_confidence;
        nova_reason = fullProduct.nova_reason;
      }
    }
  }

  // 7. Build the master product record
  const masterProduct: MasterProduct = {
    ean,
    name,
    brand,
    image_url,
    ingredients_raw,
    ingredients_hash,
    nova_class,
    nova_confidence,
    nova_reason,
    updated_at: new Date().toISOString(),
  };

  console.log("Computed master product:", {
    ean,
    name: name?.substring(0, 50),
    brand,
    hasImage: !!image_url,
    hasIngredients: !!ingredients_raw,
    ingredientsHash: ingredients_hash?.substring(0, 16),
    novaClass: nova_class,
    novaConfidence: nova_confidence,
  });

  // 8. Upsert into products table
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
    novaRecomputed: needsNovaRecomputation,
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
        novaRecomputed: result.novaRecomputed,
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
