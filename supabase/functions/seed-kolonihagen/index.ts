import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const REMA_1000_CHAIN_ID = "199d092a-0c02-452a-996a-f42771975203";

interface KolonihagenProduct {
  name: string;
  ean: string;
  category: string;
  weight: string;
  epd?: string;
}

// Complete product catalog from Kolonihagen Produktkatalog 2026 PDF
const KOLONIHAGEN_PRODUCTS: KolonihagenProduct[] = [
  // === BRØD (FERSK) ===
  { name: "Grovt landbrød", ean: "7090029531565", category: "brød", weight: "700g", epd: "6035323" },
  { name: "Havrebrød med hirse", ean: "7090029531688", category: "brød", weight: "750g", epd: "6086490" },
  { name: "Landbrød med frø og kjerner", ean: "7090029532197", category: "brød", weight: "630g", epd: "6499040" },
  { name: "Baguette", ean: "7090029531855", category: "brød", weight: "450g", epd: "6224299" },
  { name: "Milk buns", ean: "7090029532371", category: "brød", weight: "240g", epd: "6775571" },
  { name: "Flerkornbrød bakemiks", ean: "7032069721704", category: "brød", weight: "1kg", epd: "4774527" },
  { name: "Glutenfritt brød", ean: "7090029531626", category: "brød", weight: "500g", epd: "6070734" },
  { name: "Fine rundstykker", ean: "7032069737514", category: "brød", weight: "250g", epd: "6259964" },
  { name: "Grove rundstykker", ean: "7090029532098", category: "brød", weight: "400g", epd: "6402010" },
  { name: "Landbrødstykker", ean: "7090029532067", category: "brød", weight: "400g", epd: "6401939" },

  // === BRØD (FRYST) ===
  { name: "Ciabatta, fryst", ean: "7032069105047", category: "brød", weight: "260g", epd: "6744759" },
  { name: "Milk buns, fryst", ean: "7032069105030", category: "brød", weight: "500g", epd: "6746507" },
  { name: "Pidebrød, fryst", ean: "7032069105023", category: "brød", weight: "220g", epd: "6747901" },

  // === KOLONIAL ===
  { name: "Sorte bønner", ean: "7032069736715", category: "kolonial", weight: "380g", epd: "6399091" },
  { name: "Fullkornscouscous", ean: "7032069735022", category: "kolonial", weight: "500g", epd: "6094882" },
  { name: "Quinoa", ean: "7032069735039", category: "kolonial", weight: "500g", epd: "6225395" },
  { name: "Kokosmelk", ean: "7032069105238", category: "kolonial", weight: "330ml", epd: "6729412" },
  { name: "Tofu naturell", ean: "7032069106310", category: "kolonial", weight: "200g", epd: "6776686" },

  // === PÅLEGG OG SMØRBART ===
  { name: "Peanøttsmør", ean: "7032069736890", category: "pålegg", weight: "350g", epd: "6200125" },
  { name: "Sjokopålegg", ean: "7032069103562", category: "pålegg", weight: "300g", epd: "6643597" },
  { name: "Meierismør", ean: "7032069725757", category: "meieri", weight: "200g", epd: "4961769" },

  // === OST ===
  { name: "Blåmuggost", ean: "7032069724439", category: "ost", weight: "125g", epd: "5154497" },
  { name: "Feta PDO", ean: "7032069760314", category: "ost", weight: "150g", epd: "6392401" },
  { name: "Vesterhavsost", ean: "7032069725740", category: "ost", weight: "250g", epd: "5017488" },

  // === SAUSER OG PESTO ===
  { name: "Pastasaus arrabbiata", ean: "7032069107034", category: "saus", weight: "280g", epd: "6802839" },
  { name: "Pastasaus tomat og basilikum", ean: "7032069107041", category: "saus", weight: "280g", epd: "6802854" },
  { name: "Pizzasaus", ean: "7032069107027", category: "saus", weight: "280g", epd: "6802797" },
  { name: "Pesto grønn", ean: "7032069731277", category: "saus", weight: "130g", epd: "5617105" },

  // === OLJE ===
  { name: "Olivenolje", ean: "7032069723586", category: "olje", weight: "500ml", epd: "6023980" },
  { name: "Rapsolje", ean: "7032069101049", category: "olje", weight: "500ml", epd: "6494223" },
  { name: "Solsikkeolje", ean: "7032069105221", category: "olje", weight: "500ml", epd: "6753446" },

  // === OLIVEN ===
  { name: "Castelvetrano oliven", ean: "7032069739365", category: "kolonial", weight: "240g", epd: "6305213" },
  { name: "Kalamon oliven", ean: "7032069739358", category: "kolonial", weight: "240g", epd: "6298269" },

  // === DRIKKEVARER ===
  { name: "Iskaffe Cappuccino", ean: "7032069104866", category: "drikke", weight: "250ml", epd: "6753537" },
  { name: "Iskaffe Caffe latte", ean: "7032069100127", category: "drikke", weight: "230ml", epd: "6209407" },
  { name: "Iskaffe Mocca latte", ean: "7032069107478", category: "drikke", weight: "230ml", epd: "6419865" },
  { name: "Sparkling appelsin & sitron", ean: "7032069731437", category: "drikke", weight: "330ml", epd: "5651708" },
  { name: "Sparkling blåbær og sitron", ean: "7032069106563", category: "drikke", weight: "330ml", epd: "6787501" },
  { name: "Sparkling bringebær & grapefrukt", ean: "7032069735312", category: "drikke", weight: "330ml", epd: "6101554" },
  { name: "Sparkling eple & hylleblomst", ean: "7032069100103", category: "drikke", weight: "330ml", epd: "6409825" },
  { name: "Sparkling ingefær", ean: "7032069731468", category: "drikke", weight: "330ml", epd: "5651427" },
  { name: "Sparkling pasjonsfrukt", ean: "7032069102800", category: "drikke", weight: "330ml", epd: "6632947" },
  { name: "Sparkling sitron", ean: "7032069731444", category: "drikke", weight: "330ml", epd: "5651690" },

  // === KAFFE ===
  { name: "Filtermalt kaffe", ean: "7032069102459", category: "kaffe", weight: "250g", epd: "6558993" },
  { name: "Colombia & Etiopia Limited edition kaffebønner", ean: "7032069107478", category: "kaffe", weight: "225g", epd: "6848410" },
  { name: "Espresso hele bønner", ean: "7032069730997", category: "kaffe", weight: "225g", epd: "5620802" },
  { name: "Etiopia hele bønner", ean: "7032069730973", category: "kaffe", weight: "225g", epd: "5620638" },
  { name: "Peru hele bønner", ean: "7032069730980", category: "kaffe", weight: "225g", epd: "5620646" },

  // === YOGHURT ===
  { name: "Klemmeyoghurt blåbær", ean: "7032069733011", category: "meieri", weight: "90g", epd: "5848874" },
  { name: "Klemmeyoghurt bringebær", ean: "7032069733028", category: "meieri", weight: "90g", epd: "5848783" },
  { name: "Klemmeyoghurt jordbær og banan", ean: "7032069730713", category: "meieri", weight: "90g", epd: "5571369" },

  // === EGG ===
  { name: "Egg, 10 pakning", ean: "7032069104927", category: "egg", weight: "670g", epd: "6705354" },
  { name: "Egg, 6 pakning", ean: "7032069732007", category: "egg", weight: "390g", epd: "5966155" },

  // === FERSKVARE (GRØNT) ===
  { name: "Agurk", ean: "7040512555110", category: "grønt", weight: "350g", epd: "6431020" },
  { name: "Crispisalat", ean: "7040512565928", category: "grønt", weight: "150g", epd: "6438042" },
  { name: "Epler", ean: "7032069104521", category: "grønt", weight: "500g" },
  { name: "Gulrøtter", ean: "7040512530421", category: "grønt", weight: "500g", epd: "6436062" },
  { name: "Hjertesalat", ean: "7040512565942", category: "grønt", weight: "200g", epd: "6438626" },
  { name: "Løk, gul", ean: "7032069105252", category: "grønt", weight: "500g" },

  // === HAVREGRYN ===
  { name: "Havregryn lettkokt", ean: "7032069729021", category: "frokost", weight: "1kg", epd: "5587738" },

  // === BARNEMAT ===
  { name: "Biffgryte 12 mnd", ean: "7032069106235", category: "barnemat", weight: "210g", epd: "6771174" },
  { name: "Fullkornslasagne 8 mnd", ean: "7032069106211", category: "barnemat", weight: "190g", epd: "6770804" },
  { name: "Hønsegryte med couscous 12 mnd", ean: "7032069106242", category: "barnemat", weight: "210g", epd: "6771166" },
  { name: "Hønsegryte med grønnsaker 6 mnd", ean: "7032069106174", category: "barnemat", weight: "190g", epd: "6771018" },
  { name: "Pasta Bolognese 12 mnd", ean: "7032069106259", category: "barnemat", weight: "210g", epd: "6770986" },
  { name: "Pasta Bolognese 6 mnd", ean: "7032069106181", category: "barnemat", weight: "190g", epd: "6771034" },
  { name: "Pasta med grønnsaker 8 mnd", ean: "7032069106198", category: "barnemat", weight: "190g", epd: "6771158" },
  { name: "Ragu 8 mnd", ean: "7032069106204", category: "barnemat", weight: "190g", epd: "6771026" },
  { name: "Tex Mex 8 mnd", ean: "7032069106228", category: "barnemat", weight: "190g", epd: "6770994" },

  // === SJOKOLADE ===
  { name: "Melkesjokolade med karamell og havsalt", ean: "7032069108222", category: "sjokolade", weight: "90g", epd: "6872816" },
  { name: "Mørk sjokolade med bringebær", ean: "7032069108215", category: "sjokolade", weight: "90g", epd: "6872972" },
  { name: "Mørk sjokolade med havsalt", ean: "7032069107225", category: "sjokolade", weight: "90g", epd: "6809883" },
  { name: "Mørk sjokolade med mandler, karamell og havsalt", ean: "7032069107249", category: "sjokolade", weight: "100g", epd: "6809909" },

  // === JUICE ===
  { name: "Appelsinjuice", ean: "7032069738696", category: "drikke", weight: "90g", epd: "6305148" },
  { name: "Eplejuice", ean: "7032069738702", category: "drikke", weight: "90g", epd: "6305049" },

  // === IS ===
  { name: "Mangosorbet", ean: "7032069737842", category: "frysevarer", weight: "500ml", epd: "6230023" },
  { name: "Sitronsorbet", ean: "7032069737859", category: "frysevarer", weight: "500ml", epd: "6229710" },

  // === KJØTT OG PÅLEGG ===
  { name: "Bratwurst", ean: "7032069726495", category: "kjøtt", weight: "200g", epd: "5597679" },
  { name: "Coppa biff", ean: "2374110000006", category: "kjøtt", weight: "veievare", epd: "6422273" },
  { name: "Filetbacon", ean: "7032069738085", category: "kjøtt", weight: "100g", epd: "6234967" },
  { name: "Grillpølser", ean: "7032069739419", category: "kjøtt", weight: "280g", epd: "6295919" },
  { name: "Julepølse", ean: "7032069736098", category: "kjøtt", weight: "350g", epd: "6125595" },
  { name: "Karbonader", ean: "7032069739709", category: "kjøtt", weight: "200g", epd: "6301139" },
  { name: "Kjøttboller", ean: "7032069106792", category: "kjøtt", weight: "200g", epd: "6774939" },
  { name: "Kokt skinke", ean: "7032069726570", category: "kjøtt", weight: "100g", epd: "5073051" },
  { name: "Medisterkaker", ean: "7032069736104", category: "kjøtt", weight: "400g", epd: "6125520" },
  { name: "Ndujapølse", ean: "7032069100233", category: "kjøtt", weight: "300g", epd: "6450167" },
  { name: "Pepperskinke", ean: "7032069738856", category: "kjøtt", weight: "100g", epd: "6237002" },
  { name: "Pinnekjøtt", ean: "2374113700002", category: "kjøtt", weight: "1,5kg", epd: "6848477" },
  { name: "Presa biff", ean: "2374110100003", category: "kjøtt", weight: "veievare", epd: "6422299" },
  { name: "Salami med fennikel", ean: "7032069722626", category: "kjøtt", weight: "60g", epd: "4838603" },
  { name: "Svin, indrefilet", ean: "2374104000005", category: "kjøtt", weight: "600-800g", epd: "5393707" },
  { name: "Svin, nakkefilet", ean: "2374103600008", category: "kjøtt", weight: "700-1000g", epd: "5393715" },
  { name: "Svin, ytrefilet", ean: "2374103700005", category: "kjøtt", weight: "700-1000g", epd: "5393772" },
  { name: "Svineribbe", ean: "2374103500001", category: "kjøtt", weight: "veievare", epd: "4991576" },
];

async function seedProducts(): Promise<{
  total: number;
  sourcesUpserted: number;
  productsUpserted: number;
  offersCreated: number;
  epdEnriched: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sourcesUpserted = 0;
  let productsUpserted = 0;
  let offersCreated = 0;
  let epdEnriched = 0;

  console.log(`Starting Kolonihagen seeding: ${KOLONIHAGEN_PRODUCTS.length} products`);

  // 1. Upsert all products into product_sources
  for (const product of KOLONIHAGEN_PRODUCTS) {
    try {
      const { error } = await supabase.from("product_sources").upsert({
        ean: product.ean,
        source: "MANUAL" as const,
        source_product_id: product.ean,
        payload: {
          brand: "Kolonihagen",
          name: product.name,
          category: product.category,
          weight: product.weight,
          epd: product.epd,
          organic: true,
          store_exclusive: "rema_1000",
        },
        name: `Kolonihagen ${product.name}`,
        brand: "Kolonihagen",
        fetched_at: new Date().toISOString(),
      }, { onConflict: "ean,source", ignoreDuplicates: false });

      if (error) {
        errors.push(`product_sources ${product.ean}: ${error.message}`);
      } else {
        sourcesUpserted++;
      }
    } catch (e) {
      errors.push(`product_sources ${product.ean}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`product_sources: ${sourcesUpserted}/${KOLONIHAGEN_PRODUCTS.length} upserted`);

  // 2. Upsert into products table
  for (const product of KOLONIHAGEN_PRODUCTS) {
    try {
      const { error } = await supabase.from("products").upsert({
        ean: product.ean,
        name: `Kolonihagen ${product.name}`,
        brand: "Kolonihagen",
        updated_at: new Date().toISOString(),
      }, { onConflict: "ean", ignoreDuplicates: false });

      if (error) {
        errors.push(`products ${product.ean}: ${error.message}`);
      } else {
        productsUpserted++;
      }
    } catch (e) {
      errors.push(`products ${product.ean}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`products: ${productsUpserted}/${KOLONIHAGEN_PRODUCTS.length} upserted`);

  // 3. Create offers for Rema 1000
  const offerRows = KOLONIHAGEN_PRODUCTS.map(p => ({
    ean: p.ean,
    chain_id: REMA_1000_CHAIN_ID,
    last_seen_at: new Date().toISOString(),
    source: "MANUAL",
  }));

  const { error: offersError } = await supabase.from("offers").upsert(offerRows, {
    onConflict: "ean,chain_id",
    ignoreDuplicates: false,
  });

  if (offersError) {
    errors.push(`offers bulk: ${offersError.message}`);
  } else {
    offersCreated = offerRows.length;
  }

  console.log(`offers: ${offersCreated} created for Rema 1000`);

  // 4. EPD enrichment via VDA+ (background, best effort)
  const vdaClientId = Deno.env.get("VDA_CLIENT_ID");
  if (vdaClientId) {
    console.log("Starting VDA+/EPD enrichment...");

    // Check which EANs already have EPD data
    const allEans = KOLONIHAGEN_PRODUCTS.map(p => p.ean);
    const { data: existingEpd } = await supabase
      .from("product_sources")
      .select("ean")
      .in("ean", allEans)
      .eq("source", "EPD");

    const existingEpdEans = new Set((existingEpd || []).map(r => r.ean));
    const needsEpd = KOLONIHAGEN_PRODUCTS.filter(p => !existingEpdEans.has(p.ean));

    console.log(`EPD: ${existingEpdEans.size} already cached, ${needsEpd.length} need enrichment`);

    // Process in batches of 5 to avoid overloading
    for (let i = 0; i < needsEpd.length; i += 5) {
      const batch = needsEpd.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (product) => {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/fetch-epd`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ action: "lookup", gtin: product.ean }),
            });

            if (!res.ok) {
              await res.text();
              return null;
            }

            const data = await res.json();
            if (data.found) {
              epdEnriched++;
              console.log(`EPD enriched: ${product.name} (${product.ean})`);

              // Trigger master recompute
              await fetch(`${supabaseUrl}/functions/v1/recompute-master-product`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ ean: product.ean }),
              });
            }
            return data;
          } catch (e) {
            console.warn(`EPD failed for ${product.ean}:`, e instanceof Error ? e.message : e);
            return null;
          }
        })
      );

      // Small delay between batches
      if (i + 5 < needsEpd.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`EPD enrichment done: ${epdEnriched} products enriched`);
  } else {
    console.warn("VDA_CLIENT_ID not configured, skipping EPD enrichment");
  }

  return {
    total: KOLONIHAGEN_PRODUCTS.length,
    sourcesUpserted,
    productsUpserted,
    offersCreated,
    epdEnriched,
    errors,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow service role or authenticated users
  const authHeader = req.headers.get("Authorization");
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;

  if (!isServiceRole) {
    try {
      await validateAuth(req);
    } catch {
      return unauthorizedResponse();
    }
  }

  try {
    const result = await seedProducts();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in seed-kolonihagen:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
