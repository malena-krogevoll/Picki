import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ItemIntent {
  original: string;
  primaryProduct: string;
  productCategory: string;
  alternativeTerms: string[];
  excludePatterns: string[];
  isGenericTerm: boolean;
}

interface IntentResponse {
  intents: ItemIntent[];
  cached: number;
  aiProcessed: number;
  estimatedCost: number;
}

// In-memory cache with TTL
interface CacheEntry {
  intent: Omit<ItemIntent, 'original'>;
  timestamp: number;
  hitCount: number;
}

const intentCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pre-populated cache for common Norwegian shopping items
const COMMON_INTENTS: Record<string, Omit<ItemIntent, 'original'>> = {
  // Meieri
  "melk": { primaryProduct: "melk", productCategory: "meieri", alternativeTerms: ["mjølk", "helmelk", "lettmelk"], excludePatterns: ["sjokolademelk", "havremelk", "mandelmelk"], isGenericTerm: true },
  "ost": { primaryProduct: "gulost", productCategory: "meieri", alternativeTerms: ["cheese", "norvegia", "jarlsberg"], excludePatterns: ["ostepop", "ostesnacks"], isGenericTerm: true },
  "smør": { primaryProduct: "smør", productCategory: "meieri", alternativeTerms: ["meierismør", "bremykt"], excludePatterns: ["smørbrød", "smøreolje"], isGenericTerm: false },
  "yoghurt": { primaryProduct: "yoghurt", productCategory: "meieri", alternativeTerms: ["yogurt", "gresk yoghurt", "youghurt"], excludePatterns: ["yoghurtbrød", "yogurtbrød", "youghurtbrød", "brød"], isGenericTerm: true },
  "yogurt": { primaryProduct: "yoghurt", productCategory: "meieri", alternativeTerms: ["yoghurt", "gresk yoghurt"], excludePatterns: ["yogurtbrød", "yoghurtbrød", "brød"], isGenericTerm: true },
  "youghurt": { primaryProduct: "yoghurt", productCategory: "meieri", alternativeTerms: ["yoghurt", "yogurt", "gresk yoghurt"], excludePatterns: ["youghurtbrød", "yoghurtbrød", "yogurtbrød", "brød"], isGenericTerm: true },
  "fløte": { primaryProduct: "fløte", productCategory: "meieri", alternativeTerms: ["kremfløte", "matfløte"], excludePatterns: ["fløtegrateng", "fløteis"], isGenericTerm: false },
  "rømme": { primaryProduct: "rømme", productCategory: "meieri", alternativeTerms: ["lettrømme", "seterrømme"], excludePatterns: [], isGenericTerm: false },
  
  // Grønnsaker
  "hvitløk": { primaryProduct: "fersk hvitløk", productCategory: "grønnsaker", alternativeTerms: ["hvitløksfedd", "garlic"], excludePatterns: ["hvitløksdressing", "hvitløksaus", "hvitløksmarinade", "hvitløkspulver", "hvitløkspasta"], isGenericTerm: false },
  "løk": { primaryProduct: "løk", productCategory: "grønnsaker", alternativeTerms: ["rødløk", "gul løk"], excludePatterns: ["løkringer", "løkpulver", "løkdipp"], isGenericTerm: true },
  "tomat": { primaryProduct: "fersk tomat", productCategory: "grønnsaker", alternativeTerms: ["tomater", "cherry tomat"], excludePatterns: ["tomatpure", "tomatsaus", "tomatketchup", "tomatsuppe"], isGenericTerm: false },
  "poteter": { primaryProduct: "poteter", productCategory: "grønnsaker", alternativeTerms: ["potet", "mandelpoteter"], excludePatterns: ["potetgull", "potetmos", "pommes frites"], isGenericTerm: false },
  "gulrot": { primaryProduct: "gulrot", productCategory: "grønnsaker", alternativeTerms: ["gulrøtter", "carrot"], excludePatterns: ["gulrotkake", "gulrotjuice"], isGenericTerm: false },
  "salat": { primaryProduct: "salat", productCategory: "grønnsaker", alternativeTerms: ["issalat", "bladsalat", "rucola"], excludePatterns: ["salatkrydder", "salatdressing"], isGenericTerm: true },
  "agurk": { primaryProduct: "agurk", productCategory: "grønnsaker", alternativeTerms: ["slangeagurk"], excludePatterns: ["sylteagurk", "agurksnacks"], isGenericTerm: false },
  "paprika": { primaryProduct: "paprika", productCategory: "grønnsaker", alternativeTerms: ["rød paprika", "gul paprika", "grønn paprika"], excludePatterns: ["paprikapulver", "paprikachips"], isGenericTerm: false },
  "brokkoli": { primaryProduct: "brokkoli", productCategory: "grønnsaker", alternativeTerms: ["broccoli"], excludePatterns: [], isGenericTerm: false },
  "avokado": { primaryProduct: "avokado", productCategory: "grønnsaker", alternativeTerms: ["avocado"], excludePatterns: ["avokadodipp", "guacamole"], isGenericTerm: false },
  
  // Frukt
  "epler": { primaryProduct: "epler", productCategory: "frukt", alternativeTerms: ["eple", "apple"], excludePatterns: ["eplemost", "eplejuice", "eplepai", "eplemos"], isGenericTerm: false },
  "banan": { primaryProduct: "banan", productCategory: "frukt", alternativeTerms: ["bananer"], excludePatterns: ["bananmuffins", "bananchips", "tørket banan"], isGenericTerm: false },
  "appelsin": { primaryProduct: "appelsin", productCategory: "frukt", alternativeTerms: ["appelsiner"], excludePatterns: ["appelsinjuice", "appelsinbrus"], isGenericTerm: false },
  
  // Brød og bakervarer
  "brød": { primaryProduct: "brød", productCategory: "bakervarer", alternativeTerms: ["grovbrød", "loff", "kneip"], excludePatterns: ["brødpudding", "brødkrummer"], isGenericTerm: true },
  "rundstykker": { primaryProduct: "rundstykker", productCategory: "bakervarer", alternativeTerms: ["rundstykke", "horn"], excludePatterns: [], isGenericTerm: false },
  "lomper": { primaryProduct: "lomper", productCategory: "bakervarer", alternativeTerms: ["potetlomper", "lefser"], excludePatterns: [], isGenericTerm: false },
  
  // Kjøtt
  "kylling": { primaryProduct: "kylling", productCategory: "kjøtt", alternativeTerms: ["kyllingfilet", "kyllingbryst"], excludePatterns: ["kyllingpålegg", "kyllingsalat", "kyllingsuppe"], isGenericTerm: true },
  "kjøttdeig": { primaryProduct: "kjøttdeig", productCategory: "kjøtt", alternativeTerms: ["kjøtdeig", "deig"], excludePatterns: [], isGenericTerm: false },
  "bacon": { primaryProduct: "bacon", productCategory: "kjøtt", alternativeTerms: ["baconskiver", "strimlet bacon"], excludePatterns: ["bacondressing", "baconost"], isGenericTerm: false },
  "skinke": { primaryProduct: "kokt skinke", productCategory: "kjøtt", alternativeTerms: ["påleggsskinke"], excludePatterns: [], isGenericTerm: true },
  
  // Fisk
  "laks": { primaryProduct: "laks", productCategory: "fisk", alternativeTerms: ["laksefilet", "røkt laks"], excludePatterns: ["laksepålegg"], isGenericTerm: true },
  "torsk": { primaryProduct: "torsk", productCategory: "fisk", alternativeTerms: ["torskefilet"], excludePatterns: ["torskerogn"], isGenericTerm: false },
  "reker": { primaryProduct: "reker", productCategory: "fisk", alternativeTerms: ["kokte reker"], excludePatterns: ["rekesalat", "rekedressing"], isGenericTerm: false },
  
  // Snacks
  "potetgull": { primaryProduct: "potetgull", productCategory: "snacks", alternativeTerms: ["chips", "sørlandschips", "maarud", "kims"], excludePatterns: [], isGenericTerm: true },
  "chips": { primaryProduct: "potetgull", productCategory: "snacks", alternativeTerms: ["potetgull", "sørlandschips", "maarud", "kims"], excludePatterns: ["tortillachips", "nachochips", "bananachips"], isGenericTerm: true },
  "sjokolade": { primaryProduct: "sjokolade", productCategory: "snacks", alternativeTerms: ["melkesjokolade", "freia", "kvikk lunsj"], excludePatterns: ["sjokolademelk", "sjokoladepålegg", "sjokoladesaus"], isGenericTerm: true },
  "nøtter": { primaryProduct: "nøtter", productCategory: "snacks", alternativeTerms: ["peanøtter", "cashewnøtter", "mandler"], excludePatterns: ["nøttepålegg", "nøttebrød"], isGenericTerm: true },
  
  // Is og frysevarer
  "iskrem": { primaryProduct: "iskrem", productCategory: "frysemat", alternativeTerms: ["is", "diplom-is", "hennig olsen", "sørlands-is", "kroneis"], excludePatterns: [], isGenericTerm: true },
  "is": { primaryProduct: "iskrem", productCategory: "frysemat", alternativeTerms: ["iskrem", "diplom-is"], excludePatterns: ["ispinne", "iskaffe", "iste"], isGenericTerm: true },
  "frossenpizza": { primaryProduct: "frossenpizza", productCategory: "frysemat", alternativeTerms: ["pizza", "grandiosa", "big one"], excludePatterns: [], isGenericTerm: false },
  
  // Drikkevarer
  "brus": { primaryProduct: "brus", productCategory: "drikkevarer", alternativeTerms: ["cola", "fanta", "solo", "sprite"], excludePatterns: [], isGenericTerm: true },
  "juice": { primaryProduct: "juice", productCategory: "drikkevarer", alternativeTerms: ["appelsinjuice", "eplejuice"], excludePatterns: [], isGenericTerm: true },
  "kaffe": { primaryProduct: "kaffe", productCategory: "drikkevarer", alternativeTerms: ["filterkaffe", "espresso"], excludePatterns: ["kaffefløte", "iskaffe", "kaffelikør"], isGenericTerm: true },
  
  // Egg og basis
  "egg": { primaryProduct: "egg", productCategory: "egg", alternativeTerms: ["frittgående egg", "økologiske egg"], excludePatterns: ["eggerøre", "eggedosis", "eggnudler"], isGenericTerm: false },
  "mel": { primaryProduct: "hvetemel", productCategory: "basisvarer", alternativeTerms: ["sammalt", "grovt mel"], excludePatterns: [], isGenericTerm: false },
  "sukker": { primaryProduct: "sukker", productCategory: "basisvarer", alternativeTerms: ["strøsukker", "melis"], excludePatterns: ["sukkerfri"], isGenericTerm: false },
  "ris": { primaryProduct: "ris", productCategory: "basisvarer", alternativeTerms: ["jasminris", "basmatiris"], excludePatterns: ["risotto", "rispudding", "riskaker"], isGenericTerm: true },
  "pasta": { primaryProduct: "pasta", productCategory: "basisvarer", alternativeTerms: ["spaghetti", "penne", "makaroni"], excludePatterns: ["pastasaus", "pastasalat"], isGenericTerm: true },
  
  // Myke oster og smørbare produkter
  "kremost": { primaryProduct: "kremost", productCategory: "meieri", alternativeTerms: ["snøfrisk", "philadelphia", "ferskost", "smøreost"], excludePatterns: ["kremostdressing", "kremostsaus"], isGenericTerm: true },
  "ferskost": { primaryProduct: "ferskost", productCategory: "meieri", alternativeTerms: ["kremost", "snøfrisk", "philadelphia"], excludePatterns: [], isGenericTerm: true },
  "smøreost": { primaryProduct: "smøreost", productCategory: "meieri", alternativeTerms: ["kremost", "jarlsberg smøreost", "norvegia smøreost"], excludePatterns: [], isGenericTerm: true },
  "philadelphia": { primaryProduct: "philadelphia kremost", productCategory: "meieri", alternativeTerms: ["kremost", "ferskost"], excludePatterns: [], isGenericTerm: false },
  "snøfrisk": { primaryProduct: "snøfrisk", productCategory: "meieri", alternativeTerms: ["kremost", "ferskost"], excludePatterns: [], isGenericTerm: false },
  "mascarpone": { primaryProduct: "mascarpone", productCategory: "meieri", alternativeTerms: ["kremost"], excludePatterns: [], isGenericTerm: false },
  "cottage cheese": { primaryProduct: "cottage cheese", productCategory: "meieri", alternativeTerms: ["kesam", "kvarg", "hytteost"], excludePatterns: [], isGenericTerm: false },
  
  // Pålegg og smørbare
  "peanøttsmør": { primaryProduct: "peanøttsmør", productCategory: "pålegg", alternativeTerms: ["peanut butter", "skippy", "nøttepålegg"], excludePatterns: [], isGenericTerm: true },
  "nutella": { primaryProduct: "sjokoladepålegg", productCategory: "pålegg", alternativeTerms: ["nugatti", "hasselnøttpålegg"], excludePatterns: [], isGenericTerm: false },
  "nugatti": { primaryProduct: "nugatti", productCategory: "pålegg", alternativeTerms: ["nutella", "sjokoladepålegg"], excludePatterns: [], isGenericTerm: false },
  "leverpostei": { primaryProduct: "leverpostei", productCategory: "pålegg", alternativeTerms: ["postei", "gilde leverpostei", "stabburet leverpostei"], excludePatterns: [], isGenericTerm: true },
  "makrell i tomat": { primaryProduct: "makrell i tomat", productCategory: "pålegg", alternativeTerms: ["stabburet makrell", "king oscar makrell"], excludePatterns: [], isGenericTerm: false },
  "kaviar": { primaryProduct: "kaviar", productCategory: "pålegg", alternativeTerms: ["mills kaviar", "kalles kaviar", "rogn"], excludePatterns: [], isGenericTerm: true },
  "majones": { primaryProduct: "majones", productCategory: "sauser", alternativeTerms: ["mayonnaise", "mills majones", "hellmanns", "aioli"], excludePatterns: [], isGenericTerm: true },
};

// Rate limiting
let lastAICallTime = 0;
const MIN_AI_CALL_INTERVAL_MS = 100;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of intentCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      intentCache.delete(key);
    }
  }
}

function getCachedIntent(query: string): Omit<ItemIntent, 'original'> | null {
  const normalized = normalizeQuery(query);
  
  // Check pre-populated common intents first
  if (COMMON_INTENTS[normalized]) {
    return COMMON_INTENTS[normalized];
  }
  
  // Check runtime cache
  const cached = intentCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    cached.hitCount++;
    return cached.intent;
  }
  
  return null;
}

function cacheIntent(query: string, intent: Omit<ItemIntent, 'original'>) {
  const normalized = normalizeQuery(query);
  intentCache.set(normalized, {
    intent,
    timestamp: Date.now(),
    hitCount: 1
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeItemsWithAI(items: string[], lovableApiKey: string): Promise<ItemIntent[]> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastAICallTime;
  if (timeSinceLastCall < MIN_AI_CALL_INTERVAL_MS) {
    await sleep(MIN_AI_CALL_INTERVAL_MS - timeSinceLastCall);
  }
  lastAICallTime = Date.now();

  const prompt = `Du er en norsk handleliste-ekspert. Analyser disse handleliste-søkene og returner strukturert data.

Items: ${JSON.stringify(items)}

For HVERT item, bestem:
1. primaryProduct: Hva brukeren faktisk vil ha (f.eks. "hvitløk" → "fersk hvitløk", ikke hvitløksdressing)
2. productCategory: grønnsaker, meieri, kjøtt, fisk, bakervarer, snacks, frysemat, drikkevarer, basisvarer, etc.
3. alternativeTerms: Andre søkeord som gir samme produkt (maks 3)
4. excludePatterns: Produkttyper å UNNGÅ (f.eks. for "hvitløk" → ["dressing", "saus", "marinade", "pulver"])
5. isGenericTerm: true hvis søket er generisk (f.eks. "chips", "ost"), false hvis spesifikt

VIKTIG:
- Fokuser på hva forbrukeren MEST SANNSYNLIG vil ha
- "hvitløk" = fersk hvitløk, IKKE produkter som inneholder hvitløk
- "potetgull" = chips/snacks, ikke poteter
- "iskrem" = is/dessert, ikke ispinne eller iskaffe

Returner JSON array med objekter for hvert item i SAMME REKKEFØLGE som input.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du returnerer kun valid JSON uten markdown formatering." },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_intents",
              description: "Return analyzed shopping intents for all items",
              parameters: {
                type: "object",
                properties: {
                  intents: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        primaryProduct: { type: "string" },
                        productCategory: { type: "string" },
                        alternativeTerms: { type: "array", items: { type: "string" } },
                        excludePatterns: { type: "array", items: { type: "string" } },
                        isGenericTerm: { type: "boolean" }
                      },
                      required: ["primaryProduct", "productCategory", "alternativeTerms", "excludePatterns", "isGenericTerm"]
                    }
                  }
                },
                required: ["intents"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_intents" } }
      }),
    });

    if (!response.ok) {
      console.error("AI analysis failed:", response.status, await response.text());
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      // Map results back to items with original query
      return items.map((item, idx) => {
        const intent = parsed.intents?.[idx] || {
          primaryProduct: item,
          productCategory: "ukjent",
          alternativeTerms: [],
          excludePatterns: [],
          isGenericTerm: false
        };
        
        return {
          original: item,
          ...intent
        };
      });
    }
    
    throw new Error("No tool call in response");
  } catch (err) {
    console.error("AI analysis error:", err);
    // Return fallback intents
    return items.map(item => ({
      original: item,
      primaryProduct: item,
      productCategory: "ukjent",
      alternativeTerms: [],
      excludePatterns: [],
      isGenericTerm: false
    }));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { items } = await req.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Items array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean old cache entries
    cleanCache();

    const results: ItemIntent[] = [];
    const uncachedItems: { index: number; query: string }[] = [];
    let cachedCount = 0;

    // Check cache for each item
    for (let i = 0; i < items.length; i++) {
      const query = items[i];
      const cached = getCachedIntent(query);
      
      if (cached) {
        results[i] = { original: query, ...cached };
        cachedCount++;
      } else {
        uncachedItems.push({ index: i, query });
      }
    }

    // Process uncached items with AI (if any)
    let aiProcessedCount = 0;
    if (uncachedItems.length > 0) {
      const uncachedQueries = uncachedItems.map(u => u.query);
      const aiResults = await analyzeItemsWithAI(uncachedQueries, lovableApiKey);
      
      for (let i = 0; i < uncachedItems.length; i++) {
        const { index, query } = uncachedItems[i];
        const intent = aiResults[i];
        
        results[index] = intent;
        
        // Cache the result (without 'original')
        const { original, ...intentWithoutOriginal } = intent;
        cacheIntent(query, intentWithoutOriginal);
      }
      
      aiProcessedCount = uncachedItems.length;
    }

    const responseTimeMs = Date.now() - startTime;
    const estimatedCost = aiProcessedCount * 0.00005; // Approximate cost per item in batch

    // Log usage for cost monitoring
    console.log(JSON.stringify({
      type: "AI_USAGE",
      timestamp: new Date().toISOString(),
      operation: aiProcessedCount > 0 ? "batch_ai_call" : "cache_only",
      totalItems: items.length,
      cachedItems: cachedCount,
      aiProcessedItems: aiProcessedCount,
      estimatedCost,
      cacheHitRate: `${((cachedCount / items.length) * 100).toFixed(1)}%`,
      responseTimeMs,
      cacheSize: intentCache.size
    }));

    const response: IntentResponse = {
      intents: results,
      cached: cachedCount,
      aiProcessed: aiProcessedCount,
      estimatedCost
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-shopping-intent:", error);
    
    // Handle rate limit errors
    if (error instanceof Error && error.message.includes("429")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
