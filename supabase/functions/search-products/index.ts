import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const kassalappApiKey = Deno.env.get("KASSALAPP_API_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY"); // optional: used for spelling correction fallback

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

    // Search using Kassalapp API (primary data source)
    let candidates: ProductCandidate[] = [];
    const allCandidates: ProductCandidate[] = []; // Keep all for fallback

    try {
      // Strict: ONLY search within the selected store
      let kassalappProducts = await searchKassalappAPI(effectiveQuery, effectiveStoreCode, kassalappApiKey);

      // If no hits, retry once with a corrected query (handles typos like "mekrell" -> "makrell")
      if (kassalappProducts.length === 0 && lovableApiKey) {
        const corrected = await correctSearchQuery(originalQuery, lovableApiKey);
        if (corrected && corrected.toLowerCase() !== originalQuery.toLowerCase()) {
          const retryProducts = await searchKassalappAPI(corrected, effectiveStoreCode, kassalappApiKey);
          if (retryProducts.length > 0) {
            console.log(
              `No products for "${originalQuery}". Retrying with corrected query "${corrected}" yielded ${retryProducts.length} products.`,
            );
            effectiveQuery = corrected;
            kassalappProducts = retryProducts;
          } else {
            console.log(`No products for "${originalQuery}" and corrected "${corrected}".`);
          }
        }
      }

      console.log(`Found ${kassalappProducts.length} products from Kassalapp API for store ${effectiveStoreCode}`);

      for (const product of kassalappProducts) {
        const candidate = processProduct(product, effectiveQuery, userPreferences);
        allCandidates.push(candidate);
        // Prefer good matches (score >= 50)
        if (candidate.score >= 50) {
          candidates.push(candidate);
        }
      }

      // Fallback: if no good matches, include all store products sorted by relevance
      if (candidates.length === 0 && allCandidates.length > 0) {
        console.log("No strong matches found in store, falling back to all store products");
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
      const renvareDiff = b.renvareScore - a.renvareScore;
      if (Math.abs(renvareDiff) > 20) return renvareDiff;
      return b.score - a.score;
    });

    // Return top results
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
      .replace(/^[\"“”']+/, "")
      .replace(/[\"“”']+$/, "")
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

  // Calculate base relevance score
  let score = 0;
  const queryLower = query.toLowerCase().trim();
  const nameLower = productName.toLowerCase();
  const categoryLower = category.toLowerCase();

  // Tokenize query and product name
  // Split on spaces, hyphens, and other delimiters for better matching
  // e.g., "Stabbur-makrell i tomat" → ["stabbur", "makrell", "i", "tomat"]
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const nameTokens = nameLower.split(/[\s\-\/\(\)]+/).filter(w => w.length > 0);
  const nameWords = nameLower.split(/\s+/); // Keep original word splits for some checks
  
  // Check if ALL query words are found in the product name tokens
  const allQueryWordsFound = queryWords.every(qw => 
    nameTokens.some(nt => nt === qw || nt.includes(qw) || qw.includes(nt))
  );
  
  // Count how many query words match exactly or as part of tokens
  const exactTokenMatches = queryWords.filter(qw => nameTokens.includes(qw)).length;
  const partialTokenMatches = queryWords.filter(qw => 
    nameTokens.some(nt => (nt.includes(qw) || qw.includes(nt)) && nt !== qw)
  ).length;
  
  // Exact match gets highest score
  if (nameLower === queryLower) {
    score += 100;
  } else if (nameWords.includes(queryLower) || categoryLower === queryLower) {
    // Query is a complete word in the product name or matches category
    score += 90;
  } else if (nameLower.startsWith(queryLower + " ") || nameLower.startsWith(queryLower + ",")) {
    // Product name starts with the query word
    score += 85;
  } else if (allQueryWordsFound && queryWords.length > 1) {
    // All query words found in tokenized name (handles "makrell i tomat" → "Stabbur-makrell i tomat")
    // Score based on how many are exact vs partial matches
    const exactRatio = exactTokenMatches / queryWords.length;
    score += 70 + (exactRatio * 15); // 70-85 depending on exact matches
  } else if (nameTokens.some(token => token === queryLower)) {
    // Exact token match (e.g., "makrell" matches token in "Stabbur-makrell")
    score += 75;
  } else if (nameLower.includes(queryLower)) {
    // Query is a substring - could be partial match (e.g., "brød" in "knekkebrød")
    // Check if it's a compound word (penalize) vs separate word (reward)
    const isCompoundWord = nameWords.some(word => 
      word.includes(queryLower) && word !== queryLower && word.length > queryLower.length + 2
    );
    score += isCompoundWord ? 30 : 70; // Penalize compound words like knekkebrød
  } else {
    // Fuzzy matching - check token-level matches
    const tokenMatches = queryWords.filter((word) =>
      nameTokens.some((token) => token === word || token.startsWith(word) || token.includes(word)),
    );
    score += (tokenMatches.length / queryWords.length) * 50;
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

  // Map frontend store codes to Kassalapp store identifiers for filtering.
  // Kassalapp's `store.name` can be generic (e.g. "Coop"), so we support matching on BOTH:
  // - store.code (preferred when available)
  // - store.name (fallback)
  const storeFilterMapping: Record<
    string,
    {
      names: string[]; // substrings to match against store.name (lowercased)
      codes?: string[]; // substrings to match against store.code (lowercased)
    }
  > = {
    MENY_NO: { names: ["meny"], codes: ["meny"] },
    KIWI: { names: ["kiwi"], codes: ["kiwi"] },
    REMA_1000: { names: ["rema 1000", "rema"], codes: ["rema", "rema_1000"] },

    // Coop stores: Kassalapp often returns store.name as just "Coop".
    // We still keep the selection within Coop, but cannot reliably distinguish Mega/Extra/Prix/Obs if the API doesn't provide it.
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

  // Strict: if a store is selected but we don't recognize it, return 0 results
  // (never leak suggestions from other stores)
  if (storeCode && !allowed) {
    console.warn(`Unknown storeCode "${storeCode}" (no mapping). Returning 0 results.`);
    return [];
  }

  const allItems: any[] = [];
  const maxPages = 5; // Fetch up to 5 pages (500 products max)
  const pageSize = 100; // Maximum allowed by API

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchPage = async (page: number): Promise<any[]> => {
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
        console.warn(
          `Kassalapp rate-limited (429) on page ${page} (attempt ${attempt}). Waiting ${retryAfterMs}ms...`,
        );
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
    console.log(`Searching Kassalapp API for "${query}"${storeCode ? ` (filtering for ${storeCode})` : ""}`);

    // NOTE: We intentionally avoid fetching all pages in parallel here because Kassalapp rate-limits (429)
    // when many requests are fired at once (especially when the client searches many list items).
    for (let page = 1; page <= maxPages; page++) {
      const items = await fetchPage(page);

      if (items.length === 0) {
        break;
      }

      allItems.push(...items);
      console.log(`Page ${page}: Got ${items.length} products (total: ${allItems.length})`);

      // If we got fewer than pageSize, this is likely the last page
      if (items.length < pageSize) {
        break;
      }
    }

    console.log(`Total fetched: ${allItems.length} products from up to ${maxPages} pages`);

    // Filter by store if storeCode is provided
    let filteredItems = allItems;
    if (storeCode && allowed) {
      filteredItems = allItems.filter((item) => {
        const storeName = (item?.store?.name ?? "").toLowerCase();
        const storeCodeFromApi = (item?.store?.code ?? "").toLowerCase();

        // Prefer code match if possible
        if (storeCodeFromApi) {
          if (storeCodeFromApi === storeCode.toLowerCase()) return true;
          if (allowed.codes?.some((c) => storeCodeFromApi.includes(c))) return true;
        }

        // Fallback to name matching
        return allowed.names.some((n) => storeName.includes(n));
      });
    }

    console.log(`Total: ${allItems.length} products fetched` + (storeCode ? `, ${filteredItems.length} match ${storeCode}` : ""));

    // Log available store identifiers for debugging if no matches
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
