import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  storeId?: string;
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


// Kategorier som IKKE er mat/drikke - skal ekskluderes
const excludedCategories = [
  "husholdning",
  "rengjøring",
  "personlig pleie",
  "hygiene",
  "dyremat",
  "hundemat",
  "kattemat",
  "vaskemiddel",
  "oppvask",
  "toalettpapir",
  "bleier",
  "sjampo",
  "såpe",
  "tannkrem",
  "deodorant",
  "batterier",
  "lys",
  "plastposer",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const kassalappApiKey = Deno.env.get("KASSALAPP_API_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const { query, storeCode, storeId, userPreferences }: SearchRequest = await req.json();
    const effectiveStoreCode = storeCode ?? storeId;
    const originalQuery = (query ?? "").toString().trim();
    let effectiveQuery = originalQuery;

    console.log("Search request:", { query: originalQuery, storeCode: effectiveStoreCode, userPreferences });

    if (!originalQuery) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let candidates: ProductCandidate[] = [];
    const allCandidates: ProductCandidate[] = [];

    try {
      // Søk i Kassalapp API
      let kassalappProducts = await searchKassalappAPI(
        effectiveQuery, 
        effectiveStoreCode, 
        kassalappApiKey
      );

      // Hvis ingen resultater, prøv med stavekorrigering
      if (kassalappProducts.length === 0 && lovableApiKey) {
        const corrected = await correctSearchQuery(originalQuery, lovableApiKey);
        if (corrected && corrected.toLowerCase() !== originalQuery.toLowerCase()) {
          const retryProducts = await searchKassalappAPI(corrected, effectiveStoreCode, kassalappApiKey);
          if (retryProducts.length > 0) {
            console.log(`Retry with corrected query "${corrected}" yielded ${retryProducts.length} products.`);
            effectiveQuery = corrected;
            kassalappProducts = retryProducts;
          }
        }
      }

      // Filtrer ut ikke-mat produkter
      kassalappProducts = filterOutNonFoodProducts(kassalappProducts);
      console.log(`After food filter: ${kassalappProducts.length} products for store ${effectiveStoreCode}`);

      for (const product of kassalappProducts) {
        const candidate = processProduct(product, effectiveQuery, userPreferences);
        allCandidates.push(candidate);
        if (candidate.score >= 50) {
          candidates.push(candidate);
        }
      }

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

    // Sorter etter renvareScore og relevans
    candidates.sort((a, b) => {
      const renvareDiff = b.renvareScore - a.renvareScore;
      if (Math.abs(renvareDiff) > 20) return renvareDiff;
      return b.score - a.score;
    });

    const topResults = candidates.slice(0, 20);
    console.log(`Returning ${topResults.length} results, best renvareScore: ${topResults[0]?.renvareScore ?? 0}`);

    return new Response(
      JSON.stringify({
        query: originalQuery,
        effectiveQuery,
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


// Filtrer ut produkter som ikke er mat/drikke
function filterOutNonFoodProducts(products: Product[]): Product[] {
  return products.filter(product => {
    const category = (product.Kategori || "").toLowerCase();
    const name = (product.Produktnavn || "").toLowerCase();
    
    // Sjekk om produktet er i en ekskludert kategori
    for (const excluded of excludedCategories) {
      if (category.includes(excluded) || name.includes(excluded)) {
        return false;
      }
    }
    
    return true;
  });
}

async function correctSearchQuery(query: string, lovableApiKey: string): Promise<string | null> {
  const input = query.trim();
  if (input.length < 3) return null;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Du er en norsk stavekontroll for handleliste-søk. Returner kun den korrigerte søkestrengen, uten forklaring. Behold samme mening. Hvis input allerede er korrekt, returner den uendret.",
          },
          { role: "user", content: input },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("Query correction failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = (data?.choices?.[0]?.message?.content ?? "").toString().trim();
    if (!text) return null;

    const corrected = text
      .replace(/^[\"""']+/, "")
      .replace(/[\"""']+$/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!corrected || corrected.length > 80) return null;
    return corrected;
  } catch (err) {
    console.warn("Query correction error:", err);
    return null;
  }
}

function processProduct(product: Product, query: string, userPreferences?: any): ProductCandidate {
  const productName = product.Produktnavn || "";
  const allergies = product["Allergener/Kosthold"] || "";
  const ingredients = product.Ingrediensliste || "";
  const filters = product.Tilleggsfiltre || "";
  const price = product.Pris || "0";
  const category = product.Kategori || "";

  let score = 0;
  const queryLower = query.toLowerCase().trim();
  const nameLower = productName.toLowerCase();
  const categoryLower = category.toLowerCase();

  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const nameTokens = nameLower.split(/[\s\-\/\(\)]+/).filter(w => w.length > 0);
  const nameWords = nameLower.split(/\s+/);
  
  const allQueryWordsFound = queryWords.every(qw => 
    nameTokens.some(nt => nt === qw || nt.includes(qw) || qw.includes(nt))
  );
  
  const exactTokenMatches = queryWords.filter(qw => nameTokens.includes(qw)).length;
  
  if (nameLower === queryLower) {
    score += 100;
  } else if (nameWords.includes(queryLower) || categoryLower === queryLower) {
    score += 90;
  } else if (nameLower.startsWith(queryLower + " ") || nameLower.startsWith(queryLower + ",")) {
    score += 85;
  } else if (allQueryWordsFound && queryWords.length > 1) {
    const exactRatio = exactTokenMatches / queryWords.length;
    score += 70 + (exactRatio * 15);
  } else if (nameTokens.some(token => token === queryLower)) {
    score += 75;
  } else if (nameLower.includes(queryLower)) {
    const isCompoundWord = nameWords.some(word => 
      word.includes(queryLower) && word !== queryLower && word.length > queryLower.length + 2
    );
    score += isCompoundWord ? 30 : 70;
  } else {
    const tokenMatches = queryWords.filter((word) =>
      nameTokens.some((token) => token === word || token.startsWith(word) || token.includes(word)),
    );
    score += (tokenMatches.length / queryWords.length) * 50;
  }

  if (userPreferences) {
    for (const allergy of userPreferences.allergies || []) {
      if (
        allergies.toLowerCase().includes(allergy.toLowerCase()) ||
        ingredients.toLowerCase().includes(allergy.toLowerCase())
      ) {
        score = 0;
        break;
      }
    }

    for (const diet of userPreferences.diets || []) {
      if (
        diet === "vegetarian" &&
        (ingredients.toLowerCase().includes("kjøtt") || ingredients.toLowerCase().includes("fisk"))
      ) {
        score *= 0.1;
      }
      if (
        diet === "vegan" &&
        (ingredients.toLowerCase().includes("melk") ||
          ingredients.toLowerCase().includes("egg") ||
          ingredients.toLowerCase().includes("kjøtt") ||
          ingredients.toLowerCase().includes("fisk"))
      ) {
        score *= 0.1;
      }
    }

    if (userPreferences.renvare_only) {
      const isRenvare = filters.toLowerCase().includes("renvare") || productName.toLowerCase().includes("renvare");
      if (!isRenvare) {
        score *= 0.3;
      }
    }
  }

  const renvareScore = calculateRenvareScore(ingredients, filters);
  const priceNumeric = parsePrice(price);
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
  let score = 100;

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
      score -= 15;
    }
  }

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

async function searchKassalappAPI(
  query: string, 
  storeCode?: string, 
  apiKey?: string
): Promise<Product[]> {
  if (!apiKey) {
    console.warn("No Kassalapp API key provided");
    return [];
  }

  const storeFilterMapping: Record<string, { names: string[]; codes?: string[] }> = {
    MENY_NO: { names: ["meny"], codes: ["meny"] },
    KIWI: { names: ["kiwi"], codes: ["kiwi"] },
    REMA_1000: { names: ["rema 1000", "rema"], codes: ["rema", "rema_1000"] },
    COOP_MEGA: { names: ["coop mega", "coop"], codes: ["coop", "mega"] },
    COOP_EXTRA: { names: ["coop extra", "coop"], codes: ["coop", "extra"] },
    COOP_PRIX: { names: ["coop prix", "coop"], codes: ["coop", "prix"] },
    COOP_OBS: { names: ["coop obs", "obs", "coop"], codes: ["coop", "obs"] },
    SPAR_NO: { names: ["spar", "eurospar"], codes: ["spar"] },
    JOKER_NO: { names: ["joker"], codes: ["joker"] },
    ODA_NO: { names: ["oda"], codes: ["oda"] },
    BUNNPRIS: { names: ["bunnpris"], codes: ["bunnpris"] },
  };

  const allowed = storeCode ? storeFilterMapping[storeCode] : null;

  if (storeCode && !allowed) {
    console.warn(`Unknown storeCode "${storeCode}" (no mapping). Returning 0 results.`);
    return [];
  }

  const allItems: any[] = [];
  const maxPages = 10; // Økt fra 5 til 10 for bedre dekning (1000 produkter)
  const pageSize = 100;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchPage = async (page: number): Promise<any[]> => {
    // Enkel URL uten ekstra parametere som kan forårsake 422-feil
    const url = `https://kassal.app/api/v1/products?search=${encodeURIComponent(query)}&size=${pageSize}&page=${page}`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 600 * attempt;
        console.warn(`Rate-limited (429) on page ${page} (attempt ${attempt}). Waiting ${retryAfterMs}ms...`);
        await sleep(retryAfterMs);
        continue;
      }

      if (!response.ok) {
        console.error(`Kassalapp API error on page ${page}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data?.data) ? data.data : [];
    }

    console.error(`Kassalapp API still rate-limited after retries for page ${page}`);
    return [];
  };

  try {
    console.log(`Searching Kassalapp: "${query}"${storeCode ? ` (store: ${storeCode})` : ""}`);

    for (let page = 1; page <= maxPages; page++) {
      const items = await fetchPage(page);

      if (items.length === 0) {
        break;
      }

      allItems.push(...items);
      console.log(`Page ${page}: Got ${items.length} products (total: ${allItems.length})`);

      if (items.length < pageSize) {
        break;
      }
    }

    console.log(`Total fetched: ${allItems.length} products from up to ${maxPages} pages`);

    // Filtrer etter butikk hvis spesifisert
    let filteredItems = allItems;
    if (storeCode && allowed) {
      filteredItems = allItems.filter((item) => {
        const storeName = (item?.store?.name ?? "").toLowerCase();
        const storeCodeFromApi = (item?.store?.code ?? "").toLowerCase();

        if (storeCodeFromApi) {
          if (storeCodeFromApi === storeCode.toLowerCase()) return true;
          if (allowed.codes?.some((c) => storeCodeFromApi.includes(c))) return true;
        }

        return allowed.names.some((n) => storeName.includes(n));
      });
    }

    console.log(`Total: ${allItems.length} products fetched` + (storeCode ? `, ${filteredItems.length} match ${storeCode}` : ""));

    if (allItems.length > 0 && filteredItems.length === 0) {
      const storeIdentifiers = [
        ...new Set(
          allItems
            .slice(0, 50)
            .map((i: any) => `${i?.store?.name ?? ""} (${i?.store?.code ?? ""})`)
            .filter(Boolean),
        ),
      ];
      console.log("Available store identifiers in results:", storeIdentifiers);
    }

    return filteredItems.map((item: any) => ({
      EAN: item.ean,
      Produktnavn: item.name,
      Pris: item.current_price?.price?.toString() || item.current_price?.toString() || "0",
      Kjede: item.store?.name,
      StoreCode: storeCode || item.store?.code,
      Kategori: item.category?.at(-1)?.name || "",
      Merke: item.brand || "",
      "Allergener/Kosthold": item.allergens?.map((a: any) => a.display_name).join(", ") || "",
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
