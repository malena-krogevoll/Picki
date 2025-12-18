import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  storeCode?: string;
  userPreferences?: {
    allergies: string[];
    diets: string[];
    renvare_only: boolean;
    priority_order: string[];
  };
}

interface Product {
  EAN?: number;
  Produktnavn?: string;
  Pris?: string;
  Kjede?: string;
  StoreCode?: string;
  Kategori?: string;
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

    const { query, storeCode, userPreferences }: SearchRequest = await req.json();

    console.log("Search request:", { query, storeCode, userPreferences });

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search using Kassalapp API (primary data source)
    const candidates: ProductCandidate[] = [];

    try {
      const kassalappProducts = await searchKassalappAPI(query, storeCode, kassalappApiKey);
      console.log(`Found ${kassalappProducts.length} products from Kassalapp API`);

      for (const product of kassalappProducts) {
        const candidate = processProduct(product, query, userPreferences);
        if (candidate.score > 0) {
          candidates.push(candidate);
        }
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

    // Sort by score (higher is better)
    candidates.sort((a, b) => b.score - a.score);

    // Return top results
    const topResults = candidates.slice(0, 20);

    return new Response(
      JSON.stringify({
        query,
        results: topResults,
        totalFound: candidates.length,
        source: "hybrid",
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

  // Calculate base relevance score
  let score = 0;
  const queryLower = query.toLowerCase();
  const nameLower = productName.toLowerCase();

  // Exact match gets highest score
  if (nameLower === queryLower) {
    score += 100;
  } else if (nameLower.includes(queryLower)) {
    score += 80;
  } else if (nameLower.split(" ").some((word) => word.includes(queryLower))) {
    score += 60;
  } else {
    // Fuzzy matching
    const words = queryLower.split(" ");
    const nameWords = nameLower.split(" ");
    const matches = words.filter((word) =>
      nameWords.some((nameWord) => nameWord.includes(word) || word.includes(nameWord)),
    );
    score += (matches.length / words.length) * 40;
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

  try {
    const url = `https://kassal.app/api/v1/products?search=${encodeURIComponent(query)}`;
    console.log("Calling Kassalapp API:", url);

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
    console.log(`Kassalapp API returned ${data.data?.length || 0} products`);

    // Transform Kassalapp response to our Product format
    // Kassalapp returns data in data.data array
    return (
      data.data?.map((item: any) => ({
        EAN: item.ean,
        Produktnavn: item.name,
        Pris: item.current_price?.price?.toString() || "0",
        Kjede: item.store?.name,
        StoreCode: storeCode || item.store?.code,
        Kategori: item.category?.at(-1)?.name || "",
        "Allergener/Kosthold": item.allergens?.join(", ") || "",
        Tilleggsfiltre: item.nutrition?.map((n: any) => n.display_name)?.join(", ") || "",
        Produktbilde_URL: item.image,
        Ingrediensliste: item.ingredients || "",
        Region: "NO",
        Tilgjengelighet: "available",
      })) || []
    );
  } catch (error) {
    console.error("Kassalapp API search failed:", error);
    throw error;
  }
}
