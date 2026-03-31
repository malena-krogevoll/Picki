import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";
import { classifyNova } from "../_shared/novaClassifier.ts";
import type { ClassificationInput } from "../_shared/novaClassifier.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This is an admin-only batch operation
  // Accept any authenticated request for now (deploy, run once, then delete)

  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch products missing nova_class that have ingredients
  const { data: products, error } = await supabase
    .from("products")
    .select("ean, name, ingredients_raw")
    .is("nova_class", null)
    .not("ingredients_raw", "is", null)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${products?.length ?? 0} products to classify`);

  let updated = 0;
  let failed = 0;

  for (const product of products || []) {
    try {
      const input: ClassificationInput = {
        ingredients_text: product.ingredients_raw!,
        product_name: product.name ?? undefined,
      };

      const result = classifyNova(input);

      if (result.nova_group !== null) {
        // Hash ingredients
        const encoder = new TextEncoder();
        const data = encoder.encode(product.ingredients_raw!.toLowerCase().trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        const { error: updateError } = await supabase
          .from("products")
          .update({
            nova_class: result.nova_group,
            nova_confidence: result.confidence,
            nova_reason: result.reasoning,
            ingredients_hash: hashHex,
            updated_at: new Date().toISOString(),
          })
          .eq("ean", product.ean);

        if (updateError) {
          console.error(`Failed to update ${product.ean}:`, updateError);
          failed++;
        } else {
          updated++;
        }
      }
    } catch (e) {
      console.error(`Error classifying ${product.ean}:`, e);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ total: products?.length ?? 0, updated, failed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
