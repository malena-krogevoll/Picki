import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

// Initialize Supabase client with service role for DB writes
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// VDA+ (EPD) OAuth2 token cache & helpers
// ============================================
const VDA_TOKEN_URL = "https://login.microsoftonline.com/trades.no/oauth2/v2.0/token";
const VDA_API_BASE = "https://vda.tradesolution.no/api/v1";
const VDA_SCOPE = "https://trades.no/TradesolutionApi/.default";

let vdaCachedToken: string | null = null;
let vdaTokenExpiresAt = 0;

async function getVdaAccessToken(): Promise<string> {
  if (vdaCachedToken && Date.now() < vdaTokenExpiresAt - 60_000) {
    return vdaCachedToken;
  }
  const clientId = Deno.env.get("VDA_CLIENT_ID");
  const clientSecret = Deno.env.get("VDA_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("VDA credentials not configured");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: VDA_SCOPE,
  });

  const res = await fetch(VDA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("VDA token failed:", res.status, err);
    throw new Error(`VDA token failed: ${res.status}`);
  }

  const data = await res.json();
  vdaCachedToken = data.access_token;
  vdaTokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  console.log(`VDA+ token acquired, expires in ${data.expires_in}s`);
  return vdaCachedToken!;
}

async function fetchVdaProduct(gtin: string): Promise<Record<string, unknown> | null> {
  const token = await getVdaAccessToken();
  const res = await fetch(`${VDA_API_BASE}/products/${gtin}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (res.status === 404) { await res.text(); return null; }
  if (!res.ok) { const t = await res.text(); console.error(`VDA error ${res.status}:`, t); return null; }
  return await res.json();
}

// Background EPD enrichment: fetch VDA+ data for top EANs and cache to product_sources
async function enrichWithEpd(candidates: ProductCandidate[]): Promise<void> {
  const vdaClientId = Deno.env.get("VDA_CLIENT_ID");
  if (!vdaClientId) return; // Skip if VDA not configured

  // Only enrich products that have an EAN and limit to 5 to manage rate limits
  const eansToEnrich = candidates
    .filter(c => c.product.EAN)
    .map(c => String(c.product.EAN))
    .slice(0, 5);

  if (eansToEnrich.length === 0) return;

  // Check which EANs we already have EPD data for (skip those)
  const { data: existing } = await supabase
    .from("product_sources")
    .select("ean")
    .in("ean", eansToEnrich)
    .eq("source", "EPD");

  const existingEans = new Set((existing || []).map((r: any) => r.ean));
  const newEans = eansToEnrich.filter(e => !existingEans.has(e));

  if (newEans.length === 0) {
    console.log("EPD enrichment: all EANs already cached");
    return;
  }

  console.log(`EPD enrichment: fetching ${newEans.length} new products from VDA+`);

  // Fetch in parallel (all at once, max 5)
  const results = await Promise.allSettled(
    newEans.map(async (ean) => {
      const product = await fetchVdaProduct(ean);
      if (!product) return;

      await supabase.from("product_sources").upsert({
        ean,
        source: "EPD" as const,
        source_product_id: ean,
        payload: product,
        name: (product.productName as string) || null,
        brand: (product.brandName as string) || null,
        ingredients_raw: (product.ingredientStatement as string) || null,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "ean,source", ignoreDuplicates: false });
    })
  );

  const fulfilled = results.filter(r => r.status === "fulfilled").length;
  const rejected = results.filter(r => r.status === "rejected").length;
  console.log(`EPD enrichment done: ${fulfilled} ok, ${rejected} failed`);
}
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
  "majones": ["mayonnaise", "mills majones", "hellmanns", "aioli", "mayo"],
  "dressing": ["salatdressing", "thousand island", "caesar dressing"],
  "soyasaus": ["soya", "soy sauce", "kikkoman"],
  "pesto": ["basilikumpesto", "grønn pesto", "rød pesto"],
  
  // === MYKE OSTER OG SMØRBARE PRODUKTER ===
  "kremost": ["snøfrisk", "philadelphia", "philadelphia original", "creme bonjour", "buko", "ferskost", "smøreost"],
  "ferskost": ["kremost", "snøfrisk", "philadelphia", "mozzarella", "cottage cheese"],
  "smøreost": ["kremost", "snøfrisk", "kaviar", "jarlsberg smøreost", "norvegia smøreost"],
  "mascarpone": ["mascarpone", "kremost", "tiramisu ost"],
  "cottage cheese": ["kesam", "cottage", "kvarg", "hytteost"],
  
  // === PÅLEGG OG SMØRBARE ===
  "peanøttsmør": ["peanut butter", "skippy", "nøttepålegg", "peanøttpålegg", "peanøtt"],
  "nutella": ["nugatti", "sjokoladepålegg", "hasselnøttpålegg", "nøttepålegg"],
  "nugatti": ["nutella", "sjokoladepålegg", "hasselnøttpålegg"],
  "leverpostei": ["postei", "gilde leverpostei", "stabburet leverpostei", "grovpostei"],
  "makrell i tomat": ["makrell", "stabburet makrell", "king oscar makrell", "makrellfilet"],
  "kaviar": ["mills kaviar", "kalles kaviar", "rogn", "laks kaviar"],
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
  
  // Returner maks 2 søkeord for å unngå rate limiting
  return expandedQueries.slice(0, 2);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await validateAuth(req);
  } catch {
    return unauthorizedResponse();
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

      // Søk sekvensielt for å unngå rate limiting - stopp tidlig hvis gode resultater
      const seenEANs = new Set<number>();
      let kassalappProducts: Product[] = [];
      
      for (let i = 0; i < searchQueries.length; i++) {
        const queryResults = await searchKassalappAPI(searchQueries[i], effectiveStoreCode, kassalappApiKey);
        
        // Legg til unike produkter
        for (const product of queryResults) {
          if (product.EAN && seenEANs.has(product.EAN)) continue;
          if (product.EAN) seenEANs.add(product.EAN);
          kassalappProducts.push(product);
        }
        
        console.log(`Query "${searchQueries[i]}": ${queryResults.length} products (total unique: ${kassalappProducts.length})`);
        
        // Smart stopp: Hvis første søk ga 10+ resultater, ikke kjør flere søk
        if (i === 0 && kassalappProducts.length >= 10) {
          console.log("Sufficient results from first query, skipping synonyms");
          break;
        }
        
        // Legg til delay mellom synonym-søk (500ms)
        if (i < searchQueries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
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

    // Write-through cache: save to DB in background (best effort, don't block response)
    // We pass allCandidates to cache all products we received, not just top results
    cacheProductsToDatabase(allCandidates).catch(err => {
      console.error("Background cache write failed:", err);
    });

    // EPD enrichment: fetch VDA+ data for top results in background
    enrichWithEpd(topResults).catch(err => {
      console.error("Background EPD enrichment failed:", err);
    });

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
  
  // 2b. Check for compound words - if the query is part of a larger word, penalize heavily
  // This catches cases like "yogurt" matching "yogurtbrød" even when "brød" isn't in excludePatterns
  const queryLower = query.toLowerCase().trim();
  const nameWords = nameLower.split(/[\s\-\/\(\),]+/).filter(w => w.length > 0);
  const isCompoundMatch = nameWords.some(word => {
    // Word contains query but is longer (compound word)
    if (word.includes(queryLower) && word.length > queryLower.length + 2) {
      // The suffix after the query
      const suffixStart = word.indexOf(queryLower) + queryLower.length;
      const suffix = word.substring(suffixStart);
      // If there's a significant suffix, this is likely a compound word (not what user wants)
      if (suffix.length >= 3) {
        console.log(`Compound word penalty for "${productName}" (word: ${word}, suffix: ${suffix})`);
        return true;
      }
    }
    return false;
  });
  
  if (isCompoundMatch && score > 0) {
    score -= 80; // Heavy penalty for compound words
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

  // 5. Original query match (for relevance) - but not if it's a compound word
  if (nameLower.includes(queryLower) && !isCompoundMatch) {
    score += 20;
  }

  // 6. Generic term handling - boost variety
  if (intent.isGenericTerm) {
    // For generic terms, slightly boost based on name length (shorter = more specific)
    const wordCount = nameLower.split(' ').length;
    if (wordCount <= 3) score += 10;
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

// ============================================
// Write-through cache: Save products to database
// ============================================

interface RawKassalappItem {
  ean?: string | number;
  name?: string;
  brand?: string;
  image?: string;
  ingredients?: string;
  store?: {
    name?: string;
    code?: string;
  };
  [key: string]: unknown;
}

async function cacheProductsToDatabase(candidates: ProductCandidate[]): Promise<void> {
  const startTime = Date.now();
  
  // Extract unique products with EAN
  const productsWithEan = candidates.filter(c => c.product.EAN);
  if (productsWithEan.length === 0) {
    console.log("No products with EAN to cache");
    return;
  }

  console.log(`Caching ${productsWithEan.length} products to database...`);

  try {
    // 1. Collect unique chain names from all products
    const chainNames = new Set<string>();
    for (const candidate of productsWithEan) {
      const chainName = candidate.product.Kjede;
      if (chainName) {
        chainNames.add(chainName.toLowerCase().trim());
      }
    }

    // 2. Upsert chains (batch)
    const chainMap = new Map<string, string>(); // name -> id
    if (chainNames.size > 0) {
      const chainsToUpsert = Array.from(chainNames).map(name => ({ 
        name: name 
      }));

      const { data: chainData, error: chainError } = await supabase
        .from("chains")
        .upsert(chainsToUpsert, { 
          onConflict: "name",
          ignoreDuplicates: false 
        })
        .select("id, name");

      if (chainError) {
        console.error("Chain upsert error:", chainError);
      } else if (chainData) {
        for (const chain of chainData) {
          chainMap.set(chain.name.toLowerCase(), chain.id);
        }
        console.log(`Upserted ${chainData.length} chains`);
      }
    }

    // 3. Prepare product_sources batch
    const productSourcesData = productsWithEan.map(candidate => {
      const product = candidate.product;
      const ean = String(product.EAN);
      
      // Build the raw payload as stored from Kassalapp
      const payload: RawKassalappItem = {
        ean: product.EAN,
        name: product.Produktnavn,
        brand: product.Merke,
        image: product.Produktbilde_URL,
        ingredients: product.Ingrediensliste,
        category: product.Kategori,
        price: product.Pris,
        store: {
          name: product.Kjede,
          code: product.StoreCode,
        },
        allergens: product["Allergener/Kosthold"],
        nutrition: product.Tilleggsfiltre,
      };

      return {
        ean,
        source: "KASSALAPP" as const,
        source_product_id: ean, // Using EAN as source ID for Kassalapp
        payload,
        name: product.Produktnavn || null,
        brand: product.Merke || null,
        image_url: product.Produktbilde_URL || null,
        ingredients_raw: product.Ingrediensliste || null,
        fetched_at: new Date().toISOString(),
      };
    });

    // Remove duplicates by EAN (keep first occurrence)
    const seenEans = new Set<string>();
    const uniqueProductSources = productSourcesData.filter(ps => {
      if (seenEans.has(ps.ean)) return false;
      seenEans.add(ps.ean);
      return true;
    });

    // 4. Upsert product_sources (batch)
    const { error: psError } = await supabase
      .from("product_sources")
      .upsert(uniqueProductSources, { 
        onConflict: "ean,source",
        ignoreDuplicates: false 
      });

    if (psError) {
      console.error("Product sources upsert error:", psError);
    } else {
      console.log(`Upserted ${uniqueProductSources.length} product_sources`);
    }

    // 5. Prepare offers batch (ean + chain_id)
    const offersData: Array<{
      ean: string;
      chain_id: string;
      last_seen_at: string;
      source: string;
    }> = [];

    for (const candidate of productsWithEan) {
      const product = candidate.product;
      const ean = String(product.EAN);
      const chainName = product.Kjede?.toLowerCase().trim();
      
      if (chainName && chainMap.has(chainName)) {
        const chainId = chainMap.get(chainName)!;
        offersData.push({
          ean,
          chain_id: chainId,
          last_seen_at: new Date().toISOString(),
          source: "KASSALAPP",
        });
      }
    }

    // Remove duplicate offers (same ean + chain_id)
    const seenOffers = new Set<string>();
    const uniqueOffers = offersData.filter(offer => {
      const key = `${offer.ean}:${offer.chain_id}`;
      if (seenOffers.has(key)) return false;
      seenOffers.add(key);
      return true;
    });

    // 6. Upsert offers (batch)
    if (uniqueOffers.length > 0) {
      const { error: offersError } = await supabase
        .from("offers")
        .upsert(uniqueOffers, { 
          onConflict: "ean,chain_id",
          ignoreDuplicates: false 
        });

      if (offersError) {
        console.error("Offers upsert error:", offersError);
      } else {
        console.log(`Upserted ${uniqueOffers.length} offers`);
      }
    }

    console.log(`Cache write completed in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error("Cache write failed:", error);
    // Don't throw - this is best effort
  }
}
