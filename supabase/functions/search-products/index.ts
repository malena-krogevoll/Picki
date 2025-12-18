import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  // Frontend currently sends storeId (e.g. "MENY_NO")
  storeId?: string;
  // Some callers may send storeCode
  storeCode?: string;
  userPreferences?: {
    allergies?: string[];
    diets?: string[];
    renvare_only?: boolean;
    priority_order?: string[];
    other_preferences?: Record<string, unknown>;
  };
}

interface Product {
  EAN?: number;
  Produktnavn?: string;
  Pris?: string;
  Kjede?: string;
  StoreCode?: string;
  Kategori?: string;
  Merke?: string;
  "Allergener/Kosthold"?: string;
  Tilleggsfiltre?: string;
  Produktbilde_URL?: string;
  Ingrediensliste?: string;
  Region?: string;
  Tilgjengelighet?: string;
}

interface ProductCandidate {
  product: Product;
  score: number;
  priceNumeric: number;
  renvareScore: number;
  availability: string;
  matchReason: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const kassalappApiKey = Deno.env.get("KASSALAPP_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, storeCode, storeId, userPreferences }: SearchRequest = await req.json();

    const effectiveStoreCode = storeCode ?? storeId;

    console.log("Search request:", { query, storeCode: effectiveStoreCode, userPreferences });

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search using Kassalapp API (primary data source)
    let candidates: ProductCandidate[] = [];
    let allCandidates: ProductCandidate[] = []; // Keep all for fallback
    let storeFilteredOut = false;

    try {
      // First search WITH store filter
      let kassalappProducts = await searchKassalappAPI(query, effectiveStoreCode, kassalappApiKey);
      console.log(`Found ${kassalappProducts.length} products from Kassalapp API for store ${effectiveStoreCode}`);

      // If no products found with store filter, search WITHOUT filter and mark as fallback
      if (kassalappProducts.length === 0 && effectiveStoreCode) {
        console.log("No products found in selected store, searching all stores...");
        kassalappProducts = await searchKassalappAPI(query, undefined, kassalappApiKey);
        storeFilteredOut = kassalappProducts.length > 0;
        console.log(`Found ${kassalappProducts.length} products from all stores (fallback)`);
      }

      for (const product of kassalappProducts) {
        const candidate = processProduct(product, query, userPreferences);
        allCandidates.push(candidate);
        // Prefer good matches (score >= 50)
        if (candidate.score >= 50) {
          candidates.push(candidate);
        }
      }

      // Fallback: if no good matches, include all products sorted by relevance
      if (candidates.length === 0 && allCandidates.length > 0) {
        console.log("No strong matches found, falling back to all products");
        candidates = allCandidates;
      }
    } catch (apiError) {
      console.error("Kassalapp API failed:", apiError);
      return new Response(
        JSON.stringify({
          error: "Product search failed",
          details: apiError instanceof Error ? apiError.message : "Unknown error",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Sort by: 1) renvareScore (higher = cleaner), 2) relevance score
    candidates.sort((a, b) => {
      // First prioritize renvare products (higher renvareScore)
      const renvareDiff = b.renvareScore - a.renvareScore;
      if (Math.abs(renvareDiff) > 20) {
        return renvareDiff; // Significant renvare difference, prioritize cleaner
      }
      // Otherwise sort by relevance score
      return b.score - a.score;
    });

    // Return top results
    const topResults = candidates.slice(0, 20);

    console.log(`Returning ${topResults.length} results, best renvareScore: ${topResults[0]?.renvareScore ?? 0}`);

    return new Response(
      JSON.stringify({
        query,
        results: topResults,
        totalFound: candidates.length,
        source: "hybrid",
        storeNotAvailable: storeFilteredOut, // Flag to show user that store doesn't have this product
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in search-products function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function processProduct(product: Product, query: string, userPreferences?: any): ProductCandidate {
  const productName = product.Produktnavn || "";
  const allergies = product["Allergener/Kosthold"] || "";
  const ingredients = product.Ingrediensliste || "";
  const filters = product.Tilleggsfiltre || "";
  const price = product.Pris || "0";
  const category = product.Kategori || "";

  // Calculate base relevance score
  let score = 0;
  const queryLower = query.toLowerCase().trim();
  const nameLower = productName.toLowerCase();
  const categoryLower = category.toLowerCase();

  // Check if query is a substring match that could be misleading
  // e.g., "brød" matching "knekkebrød" when they're different products
  const queryWords = queryLower.split(/\s+/);
  const nameWords = nameLower.split(/\s+/);
  
  // Exact match gets highest score
  if (nameLower === queryLower) {
    score += 100;
  } else if (nameWords.includes(queryLower) || categoryLower === queryLower) {
    // Query is a complete word in the product name or matches category
    score += 90;
  } else if (nameLower.startsWith(queryLower + " ") || nameLower.startsWith(queryLower + ",")) {
    // Product name starts with the query word
    score += 85;
  } else if (nameWords.some(word => word === queryLower)) {
    // Exact word match
    score += 80;
  } else if (nameLower.includes(queryLower)) {
    // Query is a substring - could be partial match (e.g., "brød" in "knekkebrød")
    // Check if it's a compound word (penalize) vs separate word (reward)
    const isCompoundWord = nameWords.some(word => 
      word.includes(queryLower) && word !== queryLower && word.length > queryLower.length + 2
    );
    score += isCompoundWord ? 30 : 70; // Penalize compound words like knekkebrød
  } else {
    // Fuzzy matching - all query words should be present
    const matches = queryWords.filter((word) =>
      nameWords.some((nameWord) => nameWord === word || nameWord.startsWith(word)),
    );
    score += (matches.length / queryWords.length) * 40;
  }

  // Apply user preference filters
  if (userPreferences) {
    // Check allergies
    for (const allergy of userPreferences.allergies || []) {
      if (
        allergies.toLowerCase().includes(allergy.toLowerCase()) ||
        ingredients.toLowerCase().includes(allergy.toLowerCase())
      ) {
        score = 0; // Exclude products with user allergies
        break;
      }
    }

    // Check diet requirements
    for (const diet of userPreferences.diets || []) {
      if (
        diet === "vegetarian" &&
        (ingredients.toLowerCase().includes("kjøtt") || ingredients.toLowerCase().includes("fisk"))
      ) {
        score *= 0.1; // Heavily penalize non-vegetarian for vegetarians
      }
      if (
        diet === "vegan" &&
        (ingredients.toLowerCase().includes("melk") ||
          ingredients.toLowerCase().includes("egg") ||
          ingredients.toLowerCase().includes("kjøtt") ||
          ingredients.toLowerCase().includes("fisk"))
      ) {
        score *= 0.1; // Heavily penalize non-vegan for vegans
      }
    }

    // Renvare preference
    if (userPreferences.renvare_only) {
      const isRenvare = filters.toLowerCase().includes("renvare") || productName.toLowerCase().includes("renvare");
      if (!isRenvare) {
        score *= 0.3; // Penalize non-renvare products if user wants renvare only
      }
    }
  }

  // Calculate renvare score
  const renvareScore = calculateRenvareScore(ingredients, filters);

  // Parse price
  const priceNumeric = parsePrice(price);

  // Get availability
  const availability = product.Tilgjengelighet || "unknown";

  return {
    product,
    score,
    priceNumeric,
    renvareScore,
    availability,
    matchReason: getMatchReason(productName, query, score),
  };
}

function calculateRenvareScore(ingredients: string, filters: string): number {
  let score = 100; // Start with perfect score

  const harmful = [
    "konserveringsmiddel",
    "farge",
    "aroma",
    "stabilisator",
    "emulgator",
    "antioksidant",
    "sødestoff",
    "forsterkningsstoff",
  ];

  const ingredientsLower = ingredients.toLowerCase();
  const filtersLower = filters.toLowerCase();

  for (const term of harmful) {
    if (ingredientsLower.includes(term)) {
      score -= 15; // Reduce score for each harmful additive
    }
  }

  // Bonus for explicitly marked as renvare
  if (filtersLower.includes("renvare")) {
    score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^\d,.-]/g, "").replace(",", ".");
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

function getMatchReason(productName: string, query: string, score: number): string {
  const queryLower = query.toLowerCase();
  const nameLower = productName.toLowerCase();

  if (nameLower === queryLower) return "Eksakt treff";
  if (nameLower.includes(queryLower)) return "Delvis treff i produktnavn";
  if (score > 50) return "God match";
  if (score > 20) return "Mulig match";
  return "Svak match";
}

async function searchKassalappAPI(query: string, storeCode?: string, apiKey?: string): Promise<Product[]> {
  if (!apiKey) {
    console.warn("No Kassalapp API key provided");
    return [];
  }

  // Map our store codes to Kassalapp store names for filtering
  const storeNameMapping: Record<string, string[]> = {
    'MENY_NO': ['meny'],
    'KIWI_NO': ['kiwi'],
    'REMA_NO': ['rema 1000', 'rema'],
    'COOP_NO': ['coop', 'coop prix', 'coop extra', 'coop mega', 'coop obs', 'obs'],
    'SPAR_NO': ['spar', 'eurospar'],
    'JOKER_NO': ['joker'],
    'ODA_NO': ['oda'],
    'BUNNPRIS_NO': ['bunnpris'],
  };

  try {
    // Request more products to have better filtering options
    const url = `https://kassal.app/api/v1/products?search=${encodeURIComponent(query)}&size=50`;
    console.log("Calling Kassalapp API:", url, storeCode ? `(will filter for ${storeCode})` : "");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Kassalapp API error: ${response.status}`, errorText);
      throw new Error(`Kassalapp API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const items: any[] = Array.isArray(data?.data) ? data.data : [];

    // Filter by store name if storeCode is provided
    let filteredItems = items;
    if (storeCode && storeNameMapping[storeCode]) {
      const allowedNames = storeNameMapping[storeCode];
      filteredItems = items.filter((item) => {
        const storeName = item?.store?.name?.toLowerCase() || '';
        return allowedNames.some(name => storeName.includes(name));
      });
    }

    console.log(
      `Kassalapp API returned ${items.length} products` +
        (storeCode ? `, ${filteredItems.length} after store filter (${storeCode})` : ""),
    );

    // Log first few store names for debugging
    if (items.length > 0 && filteredItems.length === 0) {
      const storeNames = [...new Set(items.slice(0, 10).map((i: any) => i?.store?.name))];
      console.log("Available store names in results:", storeNames);
    }

    return filteredItems.map((item: any) => ({
      EAN: item.ean,
      Produktnavn: item.name,
      Pris: item.current_price?.price?.toString() || "0",
      Kjede: item.store?.name,
      StoreCode: storeCode || item.store?.code,
      Kategori: item.category?.at(-1)?.name || "",
      Merke: item.brand || "",
      "Allergener/Kosthold": item.allergens?.join(", ") || "",
      Tilleggsfiltre: item.nutrition?.map((n: any) => n.display_name)?.join(", ") || "",
      Produktbilde_URL: item.image,
      Ingrediensliste: item.ingredients || "",
      Region: "NO",
      Tilgjengelighet: "available",
    }));
  } catch (error) {
    console.error("Kassalapp API search failed:", error);
    throw error;
  }
}
