import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

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
    const { ean } = await req.json();

    if (!ean) {
      return new Response(JSON.stringify({ error: "EAN is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const KASSAL_API_KEY = Deno.env.get("KASSALAPP_API_KEY");
    if (!KASSAL_API_KEY) {
      throw new Error("KASSALAPP_API_KEY not configured");
    }

    // Retry with backoff on 429
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(`https://kassal.app/api/v1/products/ean/${ean}`, {
        headers: { Authorization: `Bearer ${KASSAL_API_KEY}` },
      });
      if (response.status === 429) {
        const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        console.warn(`Kassal 429 for ${ean}, retrying in ${wait}ms (attempt ${attempt + 1})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const status = response?.status || 'unknown';
      if (response?.status === 429) {
        console.warn(`Kassal 429 for ${ean} after retries — returning empty`);
        return new Response(JSON.stringify({ ean, rate_limited: true, error: "Rate limited — try again later" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response?.status === 404) {
        console.warn(`Kassal 404 for ${ean} — product not found`);
        return new Response(JSON.stringify({ ean, not_found: true, error: "Product not found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Kassal API error: ${status}`);
    }

    const productData = await response.json();
    const data = productData.data;
    const firstProduct = data.products?.[0];

    if (!firstProduct) {
      throw new Error("No product found for this EAN");
    }

    const details = {
      ean: data.ean,
      name: firstProduct.name,
      brand: firstProduct.brand,
      vendor: firstProduct.vendor,
      image: firstProduct.image,
      description: firstProduct.description,
      ingredients: firstProduct.ingredients || null,
      allergens: data.allergens || [],
      nutrition: data.nutrition || null,
      weight: firstProduct.weight,
      weight_unit: firstProduct.weight_unit,
      current_price: firstProduct.current_price?.price || null,
      store: firstProduct.store?.name || firstProduct.store?.code || "Ukjent",
    };

    return new Response(JSON.stringify(details), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error fetching product details:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
