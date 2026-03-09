import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

// ============================================
// VDA+ (VetDuAt) API Integration
// OAuth2 Client Credentials with in-memory token cache
// Endpoint: https://vda.tradesolution.no/api/v1/products
// ============================================

const VDA_TOKEN_URL = "https://login.microsoftonline.com/trades.no/oauth2/v2.0/token";
const VDA_API_BASE = "https://vda.tradesolution.no/api/v1";
const VDA_SCOPE = "https://trades.no/TradesolutionApi/.default";

// In-memory token cache (survives across requests within same isolate)
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // unix ms

// Supabase service client for DB writes
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// OAuth2 Client Credentials token acquisition
// ============================================
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s safety margin)
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
  // expires_in is in seconds; convert to ms and store absolute expiry
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

  console.log(`VDA+ token acquired, expires in ${data.expires_in}s`);
  return cachedToken!;
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
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (e) {
    // DNS/network errors in edge runtime — return null gracefully
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

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`VDA+ search error ${res.status}:`, errorText);
    throw new Error(`VDA+ search error: ${res.status}`);
  }

  const data = await res.json();
  // VDA+ may return { value: [...] } or an array directly
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

    // Action: "lookup" — single product by GTIN/EAN
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

      // Cache in background
      cacheEpdProduct(product).catch(e => console.error("Background EPD cache failed:", e));

      return new Response(JSON.stringify({ found: true, product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "search" — text search
    if (action === "search") {
      if (!query) {
        return new Response(JSON.stringify({ error: "query is required for search" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const products = await searchProducts(query);

      // Cache all results in background
      Promise.all(products.map(p => cacheEpdProduct(p))).catch(e =>
        console.error("Background EPD batch cache failed:", e)
      );

      return new Response(JSON.stringify({ results: products, totalFound: products.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: "batch-lookup" — multiple GTINs at once
    if (action === "batch-lookup") {
      const gtins: string[] = Array.isArray(gtin) ? gtin : [gtin];
      if (gtins.length === 0) {
        return new Response(JSON.stringify({ error: "gtin array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch in parallel (max 10 concurrent)
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
          if (product) {
            cacheEpdProduct(product).catch(() => {});
          }
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
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
