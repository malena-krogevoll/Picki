import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ean } = await req.json();
    
    if (!ean) {
      return new Response(
        JSON.stringify({ error: 'EAN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const KASSAL_API_KEY = Deno.env.get('KASSAL_API_KEY');
    if (!KASSAL_API_KEY) {
      throw new Error('KASSAL_API_KEY not configured');
    }

    const response = await fetch(`https://kassal.app/api/v1/products/ean/${ean}`, {
      headers: { 'Authorization': `Bearer ${KASSAL_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Kassal API error: ${response.status}`);
    }

    const productData = await response.json();
    const data = productData.data;
    const firstProduct = data.products?.[0];
    
    if (!firstProduct) {
      throw new Error('No product found for this EAN');
    }

    const details = {
      ean: data.ean,
      name: firstProduct.name,
      brand: firstProduct.brand,
      vendor: firstProduct.vendor,
      image: firstProduct.image,
      description: firstProduct.description,
      ingredients: firstProduct.ingredients || 'Ingen ingrediensinformasjon tilgjengelig',
      allergens: data.allergens || [],
      nutrition: data.nutrition || null,
      weight: firstProduct.weight,
      weight_unit: firstProduct.weight_unit,
      current_price: firstProduct.current_price?.price || null,
      store: firstProduct.store?.name || firstProduct.store?.code || 'Ukjent',
    };

    return new Response(JSON.stringify(details), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
