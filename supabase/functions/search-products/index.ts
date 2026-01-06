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
  intent?: ItemIntent;
}

interface ItemIntent {
  original: string;
  primaryProduct: string;
  productCategory: string;
  alternativeTerms: string[];
  excludePatterns: string[];
  isGenericTerm: boolean;
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

// Synonym- og variantmapping for bedre søketreff
const searchSynonyms: Record<string, string[]> = {
  // === MEIERIPRODUKTER ===
  "helmelk": ["helmjølk", "h-melk", "hel melk", "helmelk 3,5%"],
  "helmjølk": ["helmelk", "h-melk", "hel melk"],
  "lettmelk": ["lettmjølk", "lett melk", "l-melk", "lettmelk 1,2%"],
  "lettmjølk": ["lettmelk", "lett melk", "l-melk"],
  "skummetmelk": ["skumma mjølk", "skummet melk", "skumma melk"],
  "melk": ["mjølk", "melk"],
  "mjølk": ["melk", "mjølk"],
  "fløte": ["fløyte", "kremfløte", "matfløte", "lettrømme"],
  "rømme": ["rømme", "lettrømme", "seterrømme"],
  "smør": ["meierismør", "butter", "smør", "bremykt"],
  "ost": ["gulost", "cheese", "norvegia", "jarlsberg", "synnøve"],
  "gulost": ["ost", "norvegia", "jarlsberg", "synnøve gulost"],
  "brunost": ["geitost", "fløtemysost", "gudbrandsdalsost"],
  "yoghurt": ["yogurt", "gresk yoghurt", "skyr", "yoplait", "activia"],
  "skyr": ["yoghurt", "gresk yoghurt"],
  "kesam": ["cottage cheese", "kesam", "kvarg"],
  
  // === BRØD OG BAKERVARER ===
  "brød": ["braud", "grovbrød", "loff", "kneip", "frokostbrød", "rundstykker"],
  "loff": ["formbrød", "hvitt brød", "toast"],
  "grovbrød": ["kneip", "brød", "fiberbrød", "fullkornsbrød"],
  "rundstykker": ["rundstykke", "boller", "horn"],
  "knekkebrød": ["knekkebrød", "wasa", "husman"],
  "lomper": ["lompe", "potetlomper", "lefser"],
  "lefser": ["lomper", "potetlefser"],
  "boller": ["skillingsboller", "kanelboller", "hveteboller"],
  
  // === KJØTT OG PÅLEGG ===
  "kjøtt": ["kjøt", "kjøttdeig", "biff", "svin", "storfe"],
  "kjøttdeig": ["kjøtdeig", "deig", "karbonadedeig"],
  "kylling": ["kyllingfilet", "kyllingbryst", "chicken", "høns"],
  "svinekjøtt": ["svin", "koteletter", "svinefilet", "ribbe"],
  "biff": ["entrecote", "indrefilet", "ytrefilet", "oksefilet"],
  "lam": ["lammekjøtt", "lammekoteletter", "fårikål"],
  "bacon": ["strimlet bacon", "baconskiver", "bacon"],
  "pølse": ["pølser", "grillpølse", "wiener", "wienerpølse", "servelat"],
  "spekemat": ["spekepølse", "salami", "skinke", "serrano"],
  "skinke": ["kokt skinke", "påleggsskinke", "spekeskinke"],
  "leverpostei": ["postei", "leverpostei", "gilde"],
  
  // === FISK OG SJØMAT ===
  "fisk": ["fisk", "torsk", "laks", "sei", "hyse"],
  "laks": ["laksefilet", "salmon", "røkt laks", "gravet laks"],
  "torsk": ["torskefilet", "skrei", "klippfisk"],
  "sei": ["seifilet"],
  "reker": ["reke", "shrimp", "kokte reker"],
  "makrell": ["makrellfilet", "stekt makrell", "makrell i tomat"],
  "tunfisk": ["tuna", "tunfisk i olje", "tunfisk i vann"],
  "fiskepinner": ["findus", "fiskeboller", "fiskekaker"],
  "fiskekaker": ["fiskeboller", "fiskepudding"],
  
  // === GRØNNSAKER ===
  "grønnsaker": ["grønsaker", "grønnsak", "vegetables"],
  "poteter": ["potet", "potato", "mandelpoteter", "nypoteter"],
  "potet": ["poteter", "potato"],
  "gulrot": ["gulrøtter", "carrot", "gullerøtter"],
  "løk": ["løk", "rødløk", "hvitløk", "vårløk"],
  "hvitløk": ["hvitløksfedd", "garlic"],
  "tomat": ["tomater", "cherry tomat", "hermetisk tomat"],
  "agurk": ["slangeagurk", "cucumber"],
  "paprika": ["rød paprika", "gul paprika", "grønn paprika", "pepper"],
  "brokkoli": ["broccoli"],
  "blomkål": ["blomkål", "cauliflower"],
  "spinat": ["babyspinat", "spinach"],
  "salat": ["issalat", "rucola", "romaine", "bladsalat", "salatmix"],
  "mais": ["corn", "maiskorn", "søt mais"],
  "erter": ["grønne erter", "sukkererter"],
  "bønner": ["kidneybønner", "hvite bønner", "svarte bønner", "baked beans"],
  "sopp": ["sjampinjong", "champignon", "mushroom"],
  "avokado": ["avocado"],
  "squash": ["zucchini"],
  
  // === FRUKT OG BÆR ===
  "frukt": ["frukt", "fruit", "epler", "bananer"],
  "eple": ["epler", "apple", "granny smith", "royal gala"],
  "banan": ["bananer", "banana"],
  "appelsin": ["appelsiner", "orange", "klementiner"],
  "sitron": ["sitroner", "lemon"],
  "druer": ["drue", "grapes"],
  "jordbær": ["strawberry", "jordbær"],
  "bringebær": ["bringebær", "raspberry"],
  "blåbær": ["blåbær", "blueberry"],
  "melon": ["vannmelon", "honningmelon", "cantaloupemelon"],
  "mango": ["mango"],
  "ananas": ["pineapple", "ananas"],
  
  // === SNACKS OG SØTSAKER ===
  "potetgull": ["chips", "maarud", "kims", "sørlandschips", "potetgull salt"],
  "chips": ["potetgull", "maarud", "kims", "sørlandschips", "tortillachips"],
  "sjokolade": ["chocolate", "melkesjokolade", "freia", "nidar", "kvikk lunsj"],
  "godteri": ["candy", "smågodt", "drops", "seigmenn", "tyrkisk pansen"],
  "smågodt": ["godteri", "løsvekt", "candy"],
  "kjeks": ["cookies", "digestive", "marie", "bixit"],
  "is": ["iskrem", "ice cream", "diplom-is", "hennig olsen"],
  "iskrem": ["is", "ice cream", "softis"],
  "nøtter": ["peanøtter", "cashew", "mandler", "valnøtter", "hasselnøtter"],
  
  // === DRIKKEVARER ===
  "brus": ["cola", "fanta", "sprite", "solo", "pepsi", "mineralvann"],
  "cola": ["coca-cola", "pepsi", "cola zero", "pepsi max", "coke"],
  "juice": ["appelsinjuice", "eplejuice", "tropicana", "sunniva", "god morgen"],
  "saft": ["fun light", "lerum", "saftblandinger"],
  "vann": ["mineralvann", "farris", "imsdal", "bonaqua"],
  "kaffe": ["coffee", "filterkaffe", "espresso", "evergood", "friele", "ali"],
  "te": ["tea", "grønn te", "svart te", "lipton", "twinings"],
  "øl": ["beer", "pils", "lettøl", "alkoholfritt øl"],
  
  // === FROKOST OG KORNPRODUKTER ===
  "frokostblanding": ["corn flakes", "musli", "havregryn", "cheerios", "crunchy"],
  "müsli": ["musli", "mysli", "granola"],
  "musli": ["müsli", "mysli", "granola"],
  "havregryn": ["havre", "oats", "lettkokt havregryn", "store havregryn"],
  "grøt": ["havregrøt", "risgrøt", "grøt"],
  "cornflakes": ["corn flakes", "frokostblanding"],
  
  // === PASTA, RIS OG MIDDAG ===
  "pasta": ["spaghetti", "penne", "makaroni", "fusilli", "tagliatelle", "linguine"],
  "spaghetti": ["pasta", "spagetti"],
  "makaroni": ["pasta", "penne"],
  "ris": ["jasminris", "basmatiris", "langkornet ris", "risotto", "parboiled"],
  "nudler": ["noodles", "wok nudler", "ramen", "mr lee"],
  "pizza": ["frossenpizza", "grandiosa", "big one", "dr oetker"],
  "lasagne": ["lasagneplater", "ferdig lasagne"],
  "taco": ["tacokrydder", "tacoskjell", "tortilla", "santa maria"],
  "tortilla": ["wraps", "tacoskjell", "lefser"],
  
  // === EGG OG BASISVARER ===
  "egg": ["frittgående egg", "økologiske egg", "egg", "prior"],
  "mel": ["hvetemel", "sammalt", "grovt mel", "bakepulver"],
  "sukker": ["strøsukker", "melis", "vaniljesukker", "brunt sukker"],
  "salt": ["havsalt", "bordsalt", "kryddersalt"],
  "pepper": ["sort pepper", "kvernet pepper", "hvit pepper"],
  "olje": ["olivenolje", "rapsolje", "solsikkeolje", "matolje"],
  "olivenolje": ["extra virgin", "olive oil", "olje"],
  "eddik": ["eplecidereddik", "balsamico", "hvitvin eddik"],
  
  // === HERMETIKK OG KONSERVER ===
  "hermetikk": ["boks", "hermetisk", "konserver"],
  "tomater på boks": ["hermetiske tomater", "hakkede tomater", "crushed tomatoes"],
  "bønner på boks": ["kidneybønner", "hvite bønner", "baked beans"],
  "mais på boks": ["hermetisk mais", "søt mais"],
  
  // === FRYSEVARER ===
  "frossenpizza": ["pizza", "grandiosa", "big one"],
  "frosne grønnsaker": ["frosne erter", "frossen brokkoli", "findus"],
  "fiskepinner": ["findus fiskepinner", "frosne fiskepinner"],
  
  // === SAUSER OG DRESSINGER ===
  "ketchup": ["tomatketchup", "heinz", "idun"],
  "sennep": ["grov sennep", "dijon", "fransk sennep"],
  "majones": ["mayonnaise", "mills", "hellmanns"],
  "dressing": ["salatdressing", "thousand island", "caesar dressing"],
  "soyasaus": ["soya", "soy sauce", "kikkoman"],
  "pesto": ["basilikumpesto", "grønn pesto", "rød pesto"],
};

// Utvid søkeord med synonymer og varianter
function expandSearchQuery(query: string): string[] {
  const queryLower = query.toLowerCase().trim();
  const expandedQueries = [query]; // Alltid inkluder original først
  
  // Sjekk eksakte treff i synonym-mappingen
  if (searchSynonyms[queryLower]) {
    for (const synonym of searchSynonyms[queryLower]) {
      if (!expandedQueries.map(q => q.toLowerCase()).includes(synonym.toLowerCase())) {
        expandedQueries.push(synonym);
      }
    }
  }
  
  // Sjekk om query inneholder et synonym-nøkkelord
  for (const [key, synonyms] of Object.entries(searchSynonyms)) {
    if (queryLower.includes(key) && queryLower !== key) {
      // Erstatt nøkkelordet med synonymer
      for (const synonym of synonyms.slice(0, 2)) { // Maks 2 varianter per nøkkelord
        const expandedQuery = query.toLowerCase().replace(key, synonym);
        if (!expandedQueries.map(q => q.toLowerCase()).includes(expandedQuery)) {
          expandedQueries.push(expandedQuery);
        }
      }
    }
  }
  
  // Returner maks 3 søkeord for å balansere ytelse
  return expandedQueries.slice(0, 3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const kassalappApiKey = Deno.env.get("KASSALAPP_API_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const { query, storeCode, storeId, userPreferences, intent }: SearchRequest = await req.json();
    const effectiveStoreCode = storeCode ?? storeId;
    const originalQuery = (query ?? "").toString().trim();
    let effectiveQuery = originalQuery;

    console.log("Search request:", { query: originalQuery, storeCode: effectiveStoreCode, hasIntent: !!intent, userPreferences });

    if (!originalQuery) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let candidates: ProductCandidate[] = [];
    const allCandidates: ProductCandidate[] = [];

    try {
      // Utvid søkeord med synonymer og varianter
      const searchQueries = expandSearchQuery(effectiveQuery);
      console.log(`Expanded search queries: ${searchQueries.join(", ")}`);

      // Søk parallelt på alle utvidede søkeord
      const searchPromises = searchQueries.map(q => 
        searchKassalappAPI(q, effectiveStoreCode, kassalappApiKey)
      );
      const allResults = await Promise.all(searchPromises);
      
      // Kombiner alle resultater og fjern duplikater basert på EAN
      const seenEANs = new Set<number>();
      let kassalappProducts: Product[] = [];
      
      for (const results of allResults) {
        for (const product of results) {
          if (product.EAN && seenEANs.has(product.EAN)) continue;
          if (product.EAN) seenEANs.add(product.EAN);
          kassalappProducts.push(product);
        }
      }
      
      console.log(`Combined search results: ${kassalappProducts.length} unique products`);

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
        // Use intent-based scoring if available, otherwise fall back to basic scoring
        const candidate = intent 
          ? processProductWithIntent(product, originalQuery, intent, userPreferences)
          : processProduct(product, originalQuery, userPreferences);
        allCandidates.push(candidate);
        if (candidate.score >= 50) {
          candidates.push(candidate);
        }
      }

      // Hvis få sterke treff, inkluder også svakere treff
      if (candidates.length < 5 && allCandidates.length > 0) {
        console.log("Few strong matches, including weaker matches");
        candidates = allCandidates.filter(c => c.score >= 20);
      }
      
      if (candidates.length === 0 && allCandidates.length > 0) {
        console.log("No matches found, falling back to all products");
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

// NEW: Intent-based product scoring for semantic search
function processProductWithIntent(
  product: Product, 
  query: string, 
  intent: ItemIntent, 
  userPreferences?: any
): ProductCandidate {
  const productName = product.Produktnavn || "";
  const allergies = product["Allergener/Kosthold"] || "";
  const ingredients = product.Ingrediensliste || "";
  const filters = product.Tilleggsfiltre || "";
  const price = product.Pris || "0";
  const category = product.Kategori || "";

  let score = 0;
  const nameLower = productName.toLowerCase();
  const categoryLower = category.toLowerCase();

  // 1. Category match (50 points)
  if (matchesCategory(categoryLower, intent.productCategory)) {
    score += 50;
  }

  // 2. Exclude patterns - HEAVY penalty (-100 points per match)
  for (const pattern of intent.excludePatterns) {
    if (nameLower.includes(pattern.toLowerCase())) {
      score -= 100;
      console.log(`Excluding "${productName}" for pattern "${pattern}"`);
    }
  }

  // 3. Primary product match (80 points)
  const primaryLower = intent.primaryProduct.toLowerCase();
  if (nameLower.includes(primaryLower) || primaryLower.includes(nameLower.split(' ')[0])) {
    score += 80;
  }

  // 4. Alternative terms match (30 points, max once)
  for (const alt of intent.alternativeTerms) {
    if (nameLower.includes(alt.toLowerCase())) {
      score += 30;
      break;
    }
  }

  // 5. Original query match (for relevance)
  const queryLower = query.toLowerCase().trim();
  if (nameLower.includes(queryLower)) {
    score += 20;
  }

  // 6. Generic term handling - boost variety
  if (intent.isGenericTerm) {
    // For generic terms, slightly boost based on name length (shorter = more specific)
    const nameWords = nameLower.split(' ').length;
    if (nameWords <= 3) score += 10;
  }

  // 7. User preferences (allergies, diets, etc.)
  if (userPreferences) {
    for (const allergy of userPreferences.allergies || []) {
      if (
        allergies.toLowerCase().includes(allergy.toLowerCase()) ||
        ingredients.toLowerCase().includes(allergy.toLowerCase())
      ) {
        score = Math.min(score, 0); // Cap at 0, don't go lower for allergens
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
    matchReason: getIntentMatchReason(productName, intent, score),
  };
}

// Category matching helper
function matchesCategory(productCategory: string, intentCategory: string): boolean {
  const categoryMap: Record<string, string[]> = {
    "meieri": ["meieri", "melk", "ost", "yoghurt", "fløte", "smør"],
    "grønnsaker": ["grønnsaker", "frukt og grønt", "frukt", "grønt"],
    "frukt": ["frukt", "frukt og grønt", "bær"],
    "kjøtt": ["kjøtt", "ferskvarer", "pålegg", "kjøttvarer"],
    "fisk": ["fisk", "sjømat", "ferskvarer"],
    "bakervarer": ["bakervarer", "brød", "bakeriet", "ferske bakervarer"],
    "snacks": ["snacks", "chips", "godteri", "konfekt", "søtsaker"],
    "frysemat": ["frysevarer", "frysemat", "is", "frossen"],
    "drikkevarer": ["drikkevarer", "drikke", "brus", "juice", "kaffe", "te"],
    "basisvarer": ["tørrmat", "basisvarer", "mel", "sukker", "pasta", "ris"],
    "egg": ["egg", "meieri", "frokost"],
  };

  const intentLower = intentCategory.toLowerCase();
  const allowedCategories = categoryMap[intentLower] || [intentLower];
  
  return allowedCategories.some(cat => productCategory.includes(cat));
}

function getIntentMatchReason(productName: string, intent: ItemIntent, score: number): string {
  if (score < 0) return "Ekskludert (ikke relevant)";
  if (score >= 130) return "Perfekt match";
  if (score >= 100) return "God kategori- og produktmatch";
  if (score >= 50) return "Kategori match";
  if (score > 0) return "Mulig match";
  return "Svak match";
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
  const maxPages = 2; // Reduced for faster response with parallel searches
  const pageSize = 100;
  const startTime = Date.now();
  const maxTimeMs = 6000; // Reduced timeout for individual searches

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchPage = async (page: number): Promise<any[] | null> => {
    // Check if we're running out of time
    if (Date.now() - startTime > maxTimeMs) {
      console.warn(`Time limit reached, skipping page ${page}`);
      return null;
    }

    const url = `https://kassal.app/api/v1/products?search=${encodeURIComponent(query)}&size=${pageSize}&page=${page}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 429) {
          // Short wait only, max 2 seconds
          const waitMs = Math.min(2000, 1000 * attempt);
          console.warn(`Rate-limited (429) on page ${page}, waiting ${waitMs}ms...`);
          await sleep(waitMs);
          continue;
        }

        if (!response.ok) {
          console.error(`Kassalapp API error on page ${page}: ${response.status}`);
          return [];
        }

        const data = await response.json();
        return Array.isArray(data?.data) ? data.data : [];
      } catch (err) {
        console.error(`Fetch error on page ${page}:`, err);
        return [];
      }
    }

    console.warn(`Skipping page ${page} after rate limit retries`);
    return [];
  };

  try {
    console.log(`Searching Kassalapp: "${query}"${storeCode ? ` (store: ${storeCode})` : ""}`);

    for (let page = 1; page <= maxPages; page++) {
      const items = await fetchPage(page);

      if (items === null) {
        // Time limit reached
        break;
      }

      if (items.length === 0) {
        break;
      }

      allItems.push(...items);
      console.log(`Page ${page}: Got ${items.length} products (total: ${allItems.length})`);

      if (items.length < pageSize) {
        break;
      }
    }

    console.log(`Total fetched: ${allItems.length} products in ${Date.now() - startTime}ms`);

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
