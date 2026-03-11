import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { buildResolvedUrl } from "../_shared/doh-resolver.ts";

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
  const url = `${VDA_API_BASE}/products/${gtin}`;

  let res: Response;
  try {
    // Try DoH-resolved IP first to bypass DNS issues
    const resolved = await buildResolvedUrl(url);
    if (resolved) {
      try {
        res = await fetch(resolved.url, {
          headers: { Host: resolved.hostHeader, Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      } catch (e) {
        console.warn(`DoH-resolved VDA fetch failed, trying direct: ${e instanceof Error ? e.message : e}`);
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      }
    } else {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    }
  } catch (e) {
    console.warn(`VDA+ network error for ${gtin}: ${e instanceof Error ? e.message : e}`);
    return null;
  }

  if (res.status === 404) { await res.text(); return null; }
  if (!res.ok) { const t = await res.text(); console.error(`VDA error ${res.status}:`, t); return null; }
  return await res.json();
}

// Background EPD enrichment: fetch VDA+ data for top EANs and cache to product_sources
async function enrichWithEpd(candidates: ProductCandidate[]): Promise<string[]> {
  const enrichedEans: string[] = [];
  const vdaClientId = Deno.env.get("VDA_CLIENT_ID");
  if (!vdaClientId) {
    console.warn("EPD enrichment skipped: VDA_CLIENT_ID not configured");
    return enrichedEans;
  }

  // Increase to 10 EANs for better coverage
  const eansToEnrich = candidates
    .filter(c => c.product.EAN)
    .map(c => String(c.product.EAN))
    .slice(0, 10);

  if (eansToEnrich.length === 0) return enrichedEans;

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
    return enrichedEans;
  }

  console.log(`EPD enrichment: fetching ${newEans.length} new products from VDA+`);

  const results = await Promise.allSettled(
    newEans.map(async (ean) => {
      const product = await fetchVdaProduct(ean);
      if (!product) {
        console.warn(`VDA+ returned null for EAN ${ean}`);
        return;
      }

      console.log(`VDA+ success for EAN ${ean}: name=${(product as any).productName}, hasIngredients=${!!(product as any).ingredientStatement}`);

      const { error } = await supabase.from("product_sources").upsert({
        ean,
        source: "EPD" as const,
        source_product_id: ean,
        payload: product,
        name: (product.productName as string) || null,
        brand: (product.brandName as string) || null,
        ingredients_raw: (product.ingredientStatement as string) || null,
        image_url: (product.mainImageUrl as string) || null,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "ean,source", ignoreDuplicates: false });

      if (error) {
        console.error(`EPD cache upsert error for ${ean}:`, error);
      } else {
        enrichedEans.push(ean);
      }
    })
  );

  const fulfilled = results.filter(r => r.status === "fulfilled").length;
  const rejected = results.filter(r => r.status === "rejected").length;
  console.log(`EPD enrichment done: ${fulfilled} ok, ${rejected} failed, ${enrichedEans.length} cached`);
  return enrichedEans;
}

// Kassalapp detail fallback: fetch detailed product info for items missing ingredients/images
async function enrichWithKassalappDetails(candidates: ProductCandidate[]): Promise<string[]> {
  const enrichedEans: string[] = [];
  const kassalappApiKey = Deno.env.get("KASSALAPP_API_KEY");
  if (!kassalappApiKey) return enrichedEans;

  // Find products missing ingredients or images (max 5 to avoid rate limits)
  const needsEnrichment = candidates
    .filter(c => c.product.EAN && (!c.product.Ingrediensliste || !c.product.Produktbilde_URL))
    .map(c => String(c.product.EAN))
    .slice(0, 5);

  if (needsEnrichment.length === 0) return enrichedEans;

  // Check which we already have detailed Kassalapp data for
  const { data: existing } = await supabase
    .from("product_sources")
    .select("ean, ingredients_raw, image_url")
    .in("ean", needsEnrichment)
    .eq("source", "KASSALAPP");

  const existingMap = new Map((existing || []).map((r: any) => [r.ean, r]));
  const toFetch = needsEnrichment.filter(ean => {
    const cached = existingMap.get(ean);
    return !cached || (!cached.ingredients_raw && !cached.image_url);
  });

  if (toFetch.length === 0) return enrichedEans;

  console.log(`Kassalapp detail enrichment: fetching ${toFetch.length} products`);

  for (const ean of toFetch) {
    try {
      const res = await fetch(`https://kassal.app/api/v1/products/ean/${ean}`, {
        headers: { Authorization: `Bearer ${kassalappApiKey}` },
      });

      if (!res.ok) {
        console.warn(`Kassalapp detail fetch failed for ${ean}: ${res.status}`);
        await res.text();
        continue;
      }

      const productData = await res.json();
      const data = productData.data;
      const firstProduct = data?.products?.[0];
      if (!firstProduct) continue;

      const ingredients = firstProduct.ingredients || null;
      const image = firstProduct.image || null;

      if (ingredients || image) {
        await supabase.from("product_sources").upsert({
          ean,
          source: "KASSALAPP" as const,
          source_product_id: ean,
          payload: data,
          name: firstProduct.name || null,
          brand: firstProduct.brand || null,
          image_url: image,
          ingredients_raw: ingredients,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "ean,source", ignoreDuplicates: false });

        enrichedEans.push(ean);
        console.log(`Kassalapp detail enriched ${ean}: ingredients=${!!ingredients}, image=${!!image}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) {
      console.warn(`Kassalapp detail error for ${ean}:`, e instanceof Error ? e.message : e);
    }
  }

  return enrichedEans;
}

// Trigger master product recomputation for enriched EANs
async function triggerMasterRecompute(eans: string[]): Promise<void> {
  if (eans.length === 0) return;

  console.log(`Triggering master recompute for ${eans.length} EANs`);

  const functionUrl = `${supabaseUrl}/functions/v1/recompute-master-product`;

  const results = await Promise.allSettled(
    eans.map(async (ean) => {
      try {
        const res = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ ean }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.warn(`Recompute failed for ${ean}: ${res.status} ${text}`);
        } else {
          await res.text(); // consume body
        }
      } catch (e) {
        console.warn(`Recompute error for ${ean}:`, e instanceof Error ? e.message : e);
      }
    })
  );

  const ok = results.filter(r => r.status === "fulfilled").length;
  console.log(`Master recompute: ${ok}/${eans.length} triggered`);
}

// Universal brands that exist in all/most Norwegian grocery chains
const UNIVERSAL_BRANDS = [
  "tine", "gilde", "prior", "stabburet", "norvegia", "jarlsberg",
  "q-meieriene", "synnøve", "mills", "diplom-is", "hennig-olsen",
  "freia", "nidar", "orkla", "lerum", "idun", "delikat",
  "fjordland", "findus", "hoff", "maarud", "kims", "sørlandschips",
];

// Brands exclusive to specific chains
const REMA_EXCLUSIVE_BRANDS = ["kolonihagen"];

// Expand offers for universal brands across all chains
async function expandUniversalOffers(candidates: ProductCandidate[]): Promise<void> {
  // Get all chain IDs
  const { data: allChains } = await supabase.from("chains").select("id, name");
  if (!allChains || allChains.length < 2) return;

  const chainIds = allChains.map(c => c.id);

  // Find universal brand products
  const universalProducts = candidates.filter(c => {
    const brand = (c.product.Merke || "").toLowerCase();
    const name = (c.product.Produktnavn || "").toLowerCase();
    return c.product.EAN && UNIVERSAL_BRANDS.some(ub => brand.includes(ub) || name.startsWith(ub + " "));
  });

  if (universalProducts.length === 0) return;

  const offersToCreate: Array<{ ean: string; chain_id: string; last_seen_at: string; source: string }> = [];

  for (const candidate of universalProducts) {
    const ean = String(candidate.product.EAN);
    for (const chainId of chainIds) {
      offersToCreate.push({
        ean,
        chain_id: chainId,
        last_seen_at: new Date().toISOString(),
        source: "UNIVERSAL",
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = offersToCreate.filter(o => {
    const key = `${o.ean}:${o.chain_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length > 0) {
    const { error } = await supabase.from("offers").upsert(unique, {
      onConflict: "ean,chain_id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.warn("Universal offers expansion error:", error);
    } else {
      console.log(`Expanded ${unique.length} universal offers across ${chainIds.length} chains`);
    }
  }
}

// Search database for cached products as fallback
async function searchDatabaseFallback(
  query: string,
  storeCode: string | undefined,
  existingEans: Set<number>,
  userPreferences?: any,
  intent?: ItemIntent,
): Promise<ProductCandidate[]> {
  const queryLower = query.toLowerCase().trim();
  
  // Search product_sources by name (ilike)
  const { data: cachedProducts, error } = await supabase
    .from("product_sources")
    .select("ean, name, brand, image_url, ingredients_raw, payload")
    .or(`name.ilike.%${queryLower}%,brand.ilike.%${queryLower}%`)
    .limit(30);

  if (error || !cachedProducts || cachedProducts.length === 0) return [];

  // Filter out products we already have from Kassalapp
  const newProducts = cachedProducts.filter(p => !existingEans.has(Number(p.ean)));
  if (newProducts.length === 0) return [];

  // If store filtering, check offers table
  let allowedEans: Set<string> | null = null;
  if (storeCode) {
    // Map storeCode to chain names
    const chainNameMap: Record<string, string[]> = {
      MENY_NO: ["meny"], KIWI: ["kiwi"], REMA_1000: ["rema 1000", "rema"],
      COOP_MEGA: ["coop mega", "coop"], COOP_EXTRA: ["coop extra", "coop"],
      COOP_PRIX: ["coop prix", "coop"], COOP_OBS: ["coop obs", "coop"],
      SPAR_NO: ["spar"], JOKER_NO: ["joker"], ODA_NO: ["oda"], BUNNPRIS: ["bunnpris"],
    };
    const chainNames = chainNameMap[storeCode] || [];
    
    if (chainNames.length > 0) {
      // Get chain IDs for this store
      const { data: chains } = await supabase
        .from("chains")
        .select("id")
        .or(chainNames.map(n => `name.ilike.%${n}%`).join(","));

      if (chains && chains.length > 0) {
        const chainIds = chains.map(c => c.id);
        const eans = newProducts.map(p => p.ean);
        
        const { data: offers } = await supabase
          .from("offers")
          .select("ean")
          .in("ean", eans)
          .in("chain_id", chainIds);

        allowedEans = new Set((offers || []).map(o => o.ean));
      }
    }
  }

  const candidates: ProductCandidate[] = [];
  for (const product of newProducts) {
    // If store filter active and product not in store's offers, skip
    if (allowedEans && !allowedEans.has(product.ean)) continue;

    const payload = product.payload as any;
    const mappedProduct: Product = {
      EAN: Number(product.ean),
      Produktnavn: product.name || payload?.name || "",
      Pris: payload?.price || "0",
      Kjede: payload?.store?.name || "Ukjent",
      StoreCode: storeCode || payload?.store?.code || "",
      Kategori: payload?.category || "",
      Merke: product.brand || payload?.brand || "",
      "Allergener/Kosthold": payload?.allergens || "",
      Tilleggsfiltre: payload?.nutrition || "",
      Produktbilde_URL: product.image_url || payload?.image || "",
      Ingrediensliste: product.ingredients_raw || payload?.ingredients || "",
      Region: "NO",
      Tilgjengelighet: "cached",
    };

    const candidate = intent
      ? processProductWithIntent(mappedProduct, query, intent, userPreferences)
      : processProduct(mappedProduct, query, userPreferences);

    // Slight penalty for cached results vs fresh
    candidate.score *= 0.85;
    
    // Boost Kolonihagen products for Rema 1000 users (organic, clean food)
    const isKolonihagen = (product.brand || "").toLowerCase().includes("kolonihagen");
    if (isKolonihagen && storeCode === "REMA_1000") {
      candidate.score *= 1.15; // 15% boost for store-exclusive brand
      if (userPreferences?.other_preferences?.organic) {
        candidate.score *= 1.2; // Additional 20% boost for organic preference
      }
    }
    
    candidate.matchReason += " (fra database)";

    if (candidate.score >= 20) {
      candidates.push(candidate);
    }
  }

  console.log(`DB fallback: found ${candidates.length} additional products for "${query}"`);
  return candidates;
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

      // DB fallback: supplement with cached products if fewer than 10 results
      if (candidates.length < 10) {
        const existingEans = new Set(candidates.filter(c => c.product.EAN).map(c => c.product.EAN!));
        try {
          const dbCandidates = await searchDatabaseFallback(
            originalQuery, effectiveStoreCode, existingEans, userPreferences, intent
          );
          if (dbCandidates.length > 0) {
            candidates.push(...dbCandidates);
            console.log(`Added ${dbCandidates.length} DB fallback results (total: ${candidates.length})`);
          }
        } catch (dbErr) {
          console.warn("DB fallback search failed:", dbErr);
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

    // Look up NOVA scores from products table for NOVA-aware sorting
    const candidateEans = candidates
      .filter(c => c.product.EAN)
      .map(c => String(c.product.EAN));
    
    const novaMap = new Map<string, number>();
    if (candidateEans.length > 0) {
      try {
        const { data: novaProducts } = await supabase
          .from("products")
          .select("ean, nova_class")
          .in("ean", candidateEans)
          .not("nova_class", "is", null);
        
        if (novaProducts) {
          for (const p of novaProducts) {
            novaMap.set(p.ean, p.nova_class!);
          }
          console.log(`NOVA lookup: found scores for ${novaProducts.length}/${candidateEans.length} products`);
        }
      } catch (e) {
        console.warn("NOVA lookup failed (non-blocking):", e);
      }
    }

    // Sort: NOVA-aware ranking prioritizing clean products
    candidates.sort((a, b) => {
      const aEan = a.product.EAN ? String(a.product.EAN) : "";
      const bEan = b.product.EAN ? String(b.product.EAN) : "";
      const aNova = novaMap.get(aEan) ?? 99;
      const bNova = novaMap.get(bEan) ?? 99;

      // 1. Both have relevance scores above threshold? Compare NOVA first
      const bothRelevant = a.score >= 50 && b.score >= 50;
      if (bothRelevant && aNova !== bNova) {
        // Significant NOVA difference (e.g. NOVA 2 vs NOVA 4) trumps text score
        if (Math.abs(aNova - bNova) >= 2) return aNova - bNova;
      }

      // 2. renvareScore difference > 20 is significant
      const renvareDiff = b.renvareScore - a.renvareScore;
      if (Math.abs(renvareDiff) > 20) return renvareDiff;

      // 3. If NOVA is different by 1 and both relevant, still prefer lower NOVA
      if (bothRelevant && aNova !== bNova) return aNova - bNova;

      // 4. Fall back to text match score
      return b.score - a.score;
    });

    const topResults = candidates.slice(0, 20);
    console.log(`Returning ${topResults.length} results, best renvareScore: ${topResults[0]?.renvareScore ?? 0}`);

    // Synchronous enrichment: fill missing ingredients/images from master products table
    try {
      const eans = topResults
        .map(r => r.product.EAN?.toString())
        .filter((e): e is string => !!e);
      
      if (eans.length > 0) {
        const { data: masterProducts } = await supabase
          .from("products")
          .select("ean, name, brand, image_url, ingredients_raw")
          .in("ean", eans);
        
        if (masterProducts && masterProducts.length > 0) {
          const masterMap = new Map(masterProducts.map(p => [p.ean, p]));
          let enrichedCount = 0;
          
          for (const result of topResults) {
            const ean = result.product.EAN?.toString();
            if (!ean) continue;
            const master = masterMap.get(ean);
            if (!master) continue;
            
            // Fill missing ingredients
            if (!result.product.Ingrediensliste && master.ingredients_raw) {
              result.product.Ingrediensliste = master.ingredients_raw;
              enrichedCount++;
            }
            // Fill missing image
            if (!result.product.Produktbilde_URL && master.image_url) {
              result.product.Produktbilde_URL = master.image_url;
              enrichedCount++;
            }
            // Fill missing brand
            if (!result.product.Merke && master.brand) {
              result.product.Merke = master.brand;
            }
          }
          
          if (enrichedCount > 0) {
            console.log(`Enriched ${enrichedCount} fields from master products table`);
          }
        }
        
        // Also check product_sources for additional data
        const missingDataEans = topResults
          .filter(r => !r.product.Ingrediensliste || !r.product.Produktbilde_URL)
          .map(r => r.product.EAN?.toString())
          .filter((e): e is string => !!e);
        
        if (missingDataEans.length > 0) {
          const { data: sources } = await supabase
            .from("product_sources")
            .select("ean, ingredients_raw, image_url")
            .in("ean", missingDataEans)
            .order("fetched_at", { ascending: false });
          
          if (sources && sources.length > 0) {
            // Build map with best available data per EAN
            const sourceMap = new Map<string, { ingredients_raw: string | null; image_url: string | null }>();
            for (const src of sources) {
              const existing = sourceMap.get(src.ean);
              sourceMap.set(src.ean, {
                ingredients_raw: existing?.ingredients_raw || src.ingredients_raw,
                image_url: existing?.image_url || src.image_url,
              });
            }
            
            let sourceEnrichedCount = 0;
            for (const result of topResults) {
              const ean = result.product.EAN?.toString();
              if (!ean) continue;
              const src = sourceMap.get(ean);
              if (!src) continue;
              
              if (!result.product.Ingrediensliste && src.ingredients_raw) {
                result.product.Ingrediensliste = src.ingredients_raw;
                sourceEnrichedCount++;
              }
              if (!result.product.Produktbilde_URL && src.image_url) {
                result.product.Produktbilde_URL = src.image_url;
                sourceEnrichedCount++;
              }
            }
            
            if (sourceEnrichedCount > 0) {
              console.log(`Enriched ${sourceEnrichedCount} fields from product_sources`);
            }
          }
        }
      }
    } catch (enrichErr) {
      console.warn("Synchronous master enrichment failed (non-blocking):", enrichErr);
    }

    // Synchronous Kassalapp detail enrichment for products still missing data
    try {
      const stillMissing = topResults
        .filter(r => {
          if (!r.product.EAN) return false;
          const noIngredients = !r.product.Ingrediensliste || r.product.Ingrediensliste.trim().length === 0;
          const noImage = !r.product.Produktbilde_URL || r.product.Produktbilde_URL.trim().length === 0;
          return noIngredients || noImage;
        })
        .slice(0, 10);
      
      if (stillMissing.length > 0) {
        const kassalappApiKey = Deno.env.get("KASSALAPP_API_KEY");
        if (kassalappApiKey) {
          console.log(`Sync Kassalapp detail fetch for ${stillMissing.length} products missing data (EANs: ${stillMissing.map(r => r.product.EAN).join(', ')})`);
          
          const detailPromises = stillMissing.map(async (candidate) => {
            const ean = String(candidate.product.EAN);
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              
              const res = await fetch(`https://kassal.app/api/v1/products/ean/${ean}`, {
                headers: { Authorization: `Bearer ${kassalappApiKey}` },
                signal: controller.signal,
              });
              clearTimeout(timeout);
              
              if (!res.ok) { 
                console.warn(`Detail fetch ${ean}: HTTP ${res.status}`);
                await res.text(); 
                return; 
              }
              
              const productData = await res.json();
              const data = productData.data;
              const firstProduct = data?.products?.[0];
              if (!firstProduct) {
                console.warn(`Detail fetch ${ean}: no product in response`);
                return;
              }
              
              const hadNoIngredients = !candidate.product.Ingrediensliste || candidate.product.Ingrediensliste.trim().length === 0;
              const hadNoImage = !candidate.product.Produktbilde_URL || candidate.product.Produktbilde_URL.trim().length === 0;
              
              if (hadNoIngredients && firstProduct.ingredients) {
                candidate.product.Ingrediensliste = firstProduct.ingredients;
              }
              if (hadNoImage && firstProduct.image) {
                candidate.product.Produktbilde_URL = firstProduct.image;
              }
              if (!candidate.product.Merke && firstProduct.brand) {
                candidate.product.Merke = firstProduct.brand;
              }
              
              // Also save to product_sources for future cache hits
              if (firstProduct.ingredients || firstProduct.image) {
                await supabase.from("product_sources").upsert({
                  ean,
                  source: "KASSALAPP" as const,
                  source_product_id: ean,
                  payload: data,
                  name: firstProduct.name || null,
                  brand: firstProduct.brand || null,
                  image_url: firstProduct.image || null,
                  ingredients_raw: firstProduct.ingredients || null,
                  fetched_at: new Date().toISOString(),
                }, { onConflict: "ean,source", ignoreDuplicates: false }).catch(() => {});
              }
              
              console.log(`Sync enriched ${ean}: ingredients=${hadNoIngredients ? (firstProduct.ingredients ? 'FILLED' : 'still-missing') : 'had'}, image=${hadNoImage ? (firstProduct.image ? 'FILLED' : 'still-missing') : 'had'}`);
            } catch (e) {
              if (e instanceof Error && e.name === 'AbortError') {
                console.warn(`Detail fetch timeout for ${ean}`);
              } else {
                console.warn(`Detail fetch error for ${ean}:`, e instanceof Error ? e.message : e);
              }
            }
          });
          
          await Promise.allSettled(detailPromises);
        }
      } else {
        console.log("All top results have ingredients and images - no sync enrichment needed");
      }
    } catch (syncDetailErr) {
      console.warn("Synchronous Kassalapp detail enrichment failed:", syncDetailErr);
    }

    // Write-through cache: save to DB in background (best effort, don't block response)
    cacheProductsToDatabase(allCandidates).catch(err => {
      console.error("Background cache write failed:", err);
    });

    // Background enrichment pipeline: EPD → Kassalapp details → Master recompute → Universal offers
    (async () => {
      try {
        const epdEnriched = await enrichWithEpd(topResults);
        const kassalEnriched = await enrichWithKassalappDetails(topResults);
        const allEnriched = [...new Set([...epdEnriched, ...kassalEnriched])];
        await triggerMasterRecompute(allEnriched);
        await expandUniversalOffers(allCandidates);
      } catch (err) {
        console.error("Background enrichment pipeline failed:", err);
      }
    })();

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
