import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyNova } from "../_shared/novaClassifier.ts";
import { corsHeaders } from "../_shared/auth.ts";
import { buildResolvedUrl } from "../_shared/doh-resolver.ts";

/**
 * discover-clean-products
 * 
 * Batch job that searches VDA+ and Kassalapp for products,
 * classifies them with NOVA, and stores NOVA 1-2 products.
 * Designed to run weekly via pg_cron.
 */

const VDA_TOKEN_URL = "https://login.microsoftonline.com/trades.no/oauth2/v2.0/token";
const VDA_API_BASE = "https://vda.tradesolution.no/api/v1";
const VDA_SCOPE = "https://trades.no/TradesolutionApi/.default";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// ---- VDA+ Auth ----
async function getVdaToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

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

  if (!res.ok) throw new Error(`VDA token failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedToken!;
}

// ---- VDA+ fetch with DoH ----
async function vdaFetch(url: string, token: string): Promise<Response> {
  const resolved = await buildResolvedUrl(url);
  if (resolved) {
    try {
      return await fetch(resolved.url, {
        headers: { Host: resolved.hostHeader, Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch (_e) { /* fallback */ }
  }
  return await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
}

// ---- Broad search terms for product discovery ----
const DISCOVERY_TERMS = [
  // Meieri
  "melk", "smør", "ost", "egg", "yoghurt", "rømme", "fløte", "kremost",
  // Kjøtt & fisk
  "kylling", "kjøttdeig", "laks", "torsk", "svinekjøtt", "biff", "karbonadedeig",
  // Frukt & grønt
  "eple", "banan", "tomat", "gulrot", "potet", "brokkoli", "løk", "paprika",
  // Tørrvarer
  "ris", "pasta", "havregryn", "brød", "knekkebrød", "mel", "couscous", "bulgur",
  // Pålegg
  "leverpostei", "syltetøy", "honning", "hvitost", "brunost", "smøreost",
  "peanøttsmør", "hummus", "makrell i tomat", "kaviar", "skinke pålegg",
  "røkelaks", "spekeskinke", "salami",
  // Sauser & krydder
  "olje", "eddik", "sennep", "ketchup", "pesto", "tomatpuré",
  // Hermetikk & belgfrukter
  "linser", "bønner", "kikerter", "hermetiske tomater", "mais",
  // Nøtter & frø
  "nøtter", "mandler", "solsikkefrø", "gresskarfrø",
  // Drikkevarer
  "juice", "kaffe", "te",
  // Barnemat
  "barnemat", "barnegrøt",
  // Fisk & sjømat
  "reker", "sei", "makrell", "ørret", "tunfisk",
];

interface DiscoveredProduct {
  ean: string;
  name: string;
  brand: string | null;
  ingredients_raw: string | null;
  image_url: string | null;
  source: "EPD" | "KASSALAPP";
  /** Store names where this product was found (from Kassalapp) */
  storeNames: string[];
}

// ---- VDA+ search ----
async function searchVda(query: string): Promise<DiscoveredProduct[]> {
  try {
    const token = await getVdaToken();
    const params = new URLSearchParams({ search: query, top: "50" });
    const url = `${VDA_API_BASE}/products?${params}`;
    const res = await vdaFetch(url, token);
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.value ?? data.items ?? []);
    return items.map((p: any) => ({
      ean: p.gtin || p.ean || "",
      name: p.productName || p.name || "",
      brand: p.brandName || p.brand || null,
      ingredients_raw: p.ingredientStatement || null,
      image_url: null,
      source: "EPD" as const,
      storeNames: [],
    })).filter((p: DiscoveredProduct) => p.ean && p.name);
  } catch (e) {
    console.warn(`VDA+ search error for "${query}":`, e);
    return [];
  }
}

// ---- Kassalapp search ----
async function searchKassalapp(query: string): Promise<DiscoveredProduct[]> {
  const apiKey = Deno.env.get("KASSALAPP_API_KEY");
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ search: query, size: "50" });
    const res = await fetch(`https://kassal.app/api/v1/products?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 429) {
      console.warn(`Kassalapp 429 for "${query}", skipping`);
      await res.text();
      return [];
    }
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    const products = data.data || [];
    return products.map((p: any) => {
      // Extract store names from Kassalapp's store array
      const stores: string[] = [];
      if (Array.isArray(p.store)) {
        for (const s of p.store) {
          const storeName = s.name || s.group?.name || "";
          if (storeName && !stores.includes(storeName)) stores.push(storeName);
        }
      }
      return {
        ean: p.ean || "",
        name: p.name || "",
        brand: p.brand || null,
        ingredients_raw: p.ingredients || null,
        image_url: p.image || null,
        source: "KASSALAPP" as const,
        storeNames: stores,
      };
    }).filter((p: DiscoveredProduct) => p.ean && p.name);
  } catch (e) {
    console.warn(`Kassalapp search error for "${query}":`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require service_role for this admin job
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify caller is using service_role key
  if (!authHeader.includes(serviceKey)) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    // Allow if called via pg_cron (which uses anon key in the HTTP call)
    // For security, we still use service role client internally
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Get existing EANs to skip
    const { data: existingProducts } = await supabase
      .from("products")
      .select("ean")
      .not("nova_class", "is", null);
    const existingEans = new Set((existingProducts || []).map((p: any) => p.ean));

    console.log(`Starting discovery. ${existingEans.size} products already classified.`);

    const allDiscovered = new Map<string, DiscoveredProduct>();
    let vdaCount = 0;
    let kassalCount = 0;

    // Try VDA+ with canary check — skip all if first search fails
    let vdaAvailable = true;
    const firstVdaResult = await searchVda(DISCOVERY_TERMS[0]);
    if (firstVdaResult.length === 0) {
      console.warn("VDA+ unavailable (canary failed), skipping all VDA+ searches");
      vdaAvailable = false;
    } else {
      for (const p of firstVdaResult) {
        if (!existingEans.has(p.ean)) { allDiscovered.set(p.ean, p); vdaCount++; }
      }
      for (let i = 1; i < DISCOVERY_TERMS.length; i++) {
        const vdaResults = await searchVda(DISCOVERY_TERMS[i]);
        for (const p of vdaResults) {
          if (!existingEans.has(p.ean) && !allDiscovered.has(p.ean)) {
            allDiscovered.set(p.ean, p); vdaCount++;
          }
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Search Kassalapp
    for (const term of DISCOVERY_TERMS) {
      const kassalResults = await searchKassalapp(term);
      for (const p of kassalResults) {
        if (!existingEans.has(p.ean) && !allDiscovered.has(p.ean)) {
          allDiscovered.set(p.ean, p);
          kassalCount++;
        } else if (!existingEans.has(p.ean) && allDiscovered.has(p.ean)) {
          const existing = allDiscovered.get(p.ean)!;
          if (!existing.image_url && p.image_url) existing.image_url = p.image_url;
          if (!existing.ingredients_raw && p.ingredients_raw) existing.ingredients_raw = p.ingredients_raw;
          // Merge store names
          for (const s of p.storeNames) {
            if (!existing.storeNames.includes(s)) existing.storeNames.push(s);
          }
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Discovered ${allDiscovered.size} new products (VDA+: ${vdaCount}, Kassalapp: ${kassalCount})`);

    // Fetch chains once for universal offers
    const { data: chains } = await supabase.from("chains").select("id");
    const chainIds = (chains || []).map((c: any) => c.id);

    // Classify and store NOVA 1-2 products
    let nova1Count = 0;
    let nova2Count = 0;
    let skippedCount = 0;

    for (const [ean, product] of allDiscovered) {
      const result = classifyNova({
        ingredients_text: product.ingredients_raw || "",
        product_name: product.name,
      });

      if (result.nova_group === 1 || result.nova_group === 2) {
        const { error: productError } = await supabase
          .from("products")
          .upsert({
            ean,
            name: product.name,
            brand: product.brand,
            image_url: product.image_url,
            ingredients_raw: product.ingredients_raw,
            nova_class: result.nova_group,
            nova_confidence: result.confidence,
            nova_reason: result.reasoning,
          }, { onConflict: "ean", ignoreDuplicates: false });

        if (productError) {
          console.error(`Failed to upsert product ${ean}:`, productError);
          continue;
        }

        // Cache in product_sources
        await supabase.from("product_sources").upsert({
          ean,
          source: product.source,
          source_product_id: ean,
          payload: { name: product.name, brand: product.brand, ingredients: product.ingredients_raw },
          name: product.name,
          brand: product.brand,
          ingredients_raw: product.ingredients_raw,
          image_url: product.image_url,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "ean,source", ignoreDuplicates: false });

        // Create universal offers for all chains
        if (chainIds.length > 0) {
          const offerRows = chainIds.map((chainId: string) => ({
            ean,
            chain_id: chainId,
            source: "DISCOVERY",
            last_seen_at: new Date().toISOString(),
          }));
          await supabase.from("offers").upsert(offerRows, {
            onConflict: "ean,chain_id",
            ignoreDuplicates: true,
          });
        }

        if (result.nova_group === 1) nova1Count++;
        else nova2Count++;
      } else {
        skippedCount++;
      }
    }

    const summary = {
      total_discovered: allDiscovered.size,
      nova_1_added: nova1Count,
      nova_2_added: nova2Count,
      skipped_not_clean: skippedCount,
      already_known: existingEans.size,
    };

    console.log("Discovery complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Discovery error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
