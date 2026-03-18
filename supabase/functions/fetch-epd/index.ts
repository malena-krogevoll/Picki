import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { buildResolvedUrl } from "../_shared/doh-resolver.ts";

// ============================================
// VDA+ (VetDuAt) API Integration
// OAuth2 Client Credentials with in-memory token cache
// Uses DNS-over-HTTPS to resolve vda.tradesolution.no
// ============================================

const VDA_TOKEN_URL = "https://login.microsoftonline.com/trades.no/oauth2/v2.0/token";
const VDA_API_BASE = "https://vda.tradesolution.no/api/v1";
const VDA_HOST = "vda.tradesolution.no";
const VDA_SCOPE = "https://trades.no/TradesolutionApi/.default";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// OAuth2 Client Credentials token acquisition
// ============================================
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = Deno.env.get("VDA_CLIENT_ID");
  const clientSecret = Deno.env.get("VDA_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("VDA_CLIENT_ID or VDA_CLIENT_SECRET not configured");
  }

  console.log("Fetching new VDA+ access token...");
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
    const errorText = await res.text();
    console.error("VDA token request failed:", res.status, errorText);
    throw new Error(`VDA token request failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  console.log(`VDA+ token acquired, expires in ${data.expires_in}s`);
  return cachedToken!;
}

// ============================================
// Fetch helper with DoH fallback
// ============================================
async function vdaFetch(url: string, token: string): Promise<Response> {
  // Try DoH-resolved IP first
  const resolved = await buildResolvedUrl(url);
  if (resolved) {
    try {
      const res = await fetch(resolved.url, {
        headers: {
          Host: resolved.hostHeader,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      return res;
    } catch (e) {
      console.warn(`DoH-resolved fetch failed, trying direct: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Fallback: direct fetch (may fail with DNS error)
  return await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
}

// ============================================
// VDA+ API helpers
// ============================================
interface VdaProduct {
  gtin: string;
  productName?: string;
  brandName?: string;
  ingredientStatement?: string;
  allergenInfo?: {
    allergens?: Array<{
      allergenTypeCode?: string;
      levelOfContainmentCode?: string;
    }>;
  };
  nutrientInfo?: {
    nutrients?: Array<{
      nutrientTypeCode?: string;
      quantityContained?: number;
      measurementUnitCode?: string;
    }>;
  };
  [key: string]: unknown;
}

async function fetchProductByGtin(gtin: string): Promise<VdaProduct | null> {
  const token = await getAccessToken();
  const url = `${VDA_API_BASE}/products/${gtin}`;
  console.log(`Fetching VDA+ product: ${url}`);

  let res: Response;
  try {
    res = await vdaFetch(url, token);
  } catch (e) {
    console.warn(`VDA+ network error for ${gtin}: ${e instanceof Error ? e.message : e}`);
    return null;
  }

  if (res.status === 404) {
    console.log(`VDA+ product not found: ${gtin}`);
    await res.text();
    return null;
  }
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`VDA+ API error ${res.status}:`, errorText);
    return null;
  }
  return await res.json();
}

async function searchProducts(query: string): Promise<VdaProduct[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ search: query, top: "20" });
  const url = `${VDA_API_BASE}/products?${params}`;
  console.log(`Searching VDA+: ${url}`);

  let res: Response;
  try {
    res = await vdaFetch(url, token);
  } catch (e) {
    console.warn(`VDA+ search network error: ${e instanceof Error ? e.message : e}`);
    return [];
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`VDA+ search error ${res.status}:`, errorText);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.value ?? data.items ?? []);
}

// ============================================
// Write-through cache: save EPD data to product_sources
// ============================================
async function cacheEpdProduct(product: VdaProduct): Promise<void> {
  const ean = product.gtin;
  if (!ean) return;

  try {
    const { error } = await supabase
      .from("product_sources")
      .upsert({
        ean,
        source: "EPD" as const,
        source_product_id: ean,
        payload: product as unknown as Record<string, unknown>,
        name: product.productName || null,
        brand: product.brandName || null,
        ingredients_raw: product.ingredientStatement || null,
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: "ean,source",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("EPD cache upsert error:", error);
    }
  } catch (e) {
    console.error("EPD cache write failed:", e);
  }
}

// ============================================
// Edge function handler
// ============================================
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
    const { action, gtin, query } = await req.json();

    if (action === "lookup") {
      if (!gtin) {
        return new Response(JSON.stringify({ error: "gtin is required for lookup" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const product = await fetchProductByGtin(gtin);
      if (!product) {
        return new Response(JSON.stringify({ found: false, gtin }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      cacheEpdProduct(product).catch(e => console.error("Background EPD cache failed:", e));
      return new Response(JSON.stringify({ found: true, product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      if (!query) {
        return new Response(JSON.stringify({ error: "query is required for search" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const products = await searchProducts(query);
      Promise.all(products.map(p => cacheEpdProduct(p))).catch(e =>
        console.error("Background EPD batch cache failed:", e)
      );
      return new Response(JSON.stringify({ results: products, totalFound: products.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch-lookup") {
      const gtins: string[] = Array.isArray(gtin) ? gtin : [gtin];
      if (gtins.length === 0) {
        return new Response(JSON.stringify({ error: "gtin array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const batchSize = 10;
      const results: Record<string, VdaProduct | null> = {};

      for (let i = 0; i < gtins.length; i += batchSize) {
        const batch = gtins.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (g) => {
            try {
              return { gtin: g, product: await fetchProductByGtin(g) };
            } catch (e) {
              console.error(`Batch lookup failed for ${g}:`, e);
              return { gtin: g, product: null };
            }
          })
        );
        for (const { gtin: g, product } of batchResults) {
          results[g] = product;
          if (product) cacheEpdProduct(product).catch(() => {});
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'lookup', 'search', or 'batch-lookup'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-epd function:", error);
    return new Response(
      JSON.stringify({
        error: "An internal error occurred. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
