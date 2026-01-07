import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, recipeType = "dinner", servings = 4, difficulty = "medium" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const recipeTypePrompt = recipeType === "diy" 
      ? "en DIY-oppskrift for å lage et hjemmelaget alternativ til et vanlig ferdigprodukt (f.eks. ketchup, majones, pizzabunn)"
      : recipeType === "base"
      ? "en grunnoppskrift/baseprodukt (f.eks. buljong, pesto, hvit saus)"
      : "en sunn middagsoppskrift";

    const systemPrompt = `Du er en norsk kokk som lager sunne oppskrifter med renvarer (NOVA 1-2 ingredienser).

Regler:
- Bruk kun rene, ubearbeidede ingredienser
- Unngå tilsetningsstoffer, ferdigprodukter og ultraprosessert mat
- Identifiser alle allergener i hver ingrediens
- Skriv på norsk
- Vær spesifikk med mengder

Allergenkoder du skal bruke:
- gluten (hvete, rug, bygg, havre)
- melk (melk, fløte, smør, ost)
- egg
- fisk
- skalldyr
- nøtter
- peanøtter
- soya
- selleri
- sennep
- sesamfrø
- svoveldioksid
- lupin
- bløtdyr

Diett-tags du kan bruke:
- vegetar
- vegan
- glutenfri
- laktosefri
- lavkarbo
- pescetarisk`;

    const userPrompt = `Lag ${recipeTypePrompt}${category ? ` i kategorien "${category}"` : ""} for ${servings} porsjoner.
Vanskelighetsgrad: ${difficulty}

${recipeType === "diy" ? "Inkluder også 'replaces'-felt som beskriver hvilket ferdigprodukt dette erstatter." : ""}

Du MÅ returnere svaret som en funksjonskall.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_recipe",
              description: "Opprett en ny oppskrift med alle detaljer",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Oppskriftens tittel" },
                  description: { type: "string", description: "Kort beskrivelse av retten" },
                  servings: { type: "number", description: "Antall porsjoner" },
                  prep_time: { type: "number", description: "Forberedelsestid i minutter" },
                  cook_time: { type: "number", description: "Tilberedningstid i minutter" },
                  category: { type: "string", description: "Kategori (f.eks. Fisk, Kjøtt, Vegetar)" },
                  allergens: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Liste over allergener i oppskriften"
                  },
                  diet_tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Diett-tags (vegetar, vegan, glutenfri osv.)"
                  },
                  replaces: {
                    type: "string",
                    description: "For DIY-oppskrifter: hvilket ferdigprodukt dette erstatter"
                  },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Ingrediensnavn" },
                        quantity: { type: "string", description: "Mengde" },
                        unit: { type: "string", description: "Enhet (g, dl, stk osv.)" },
                        allergens: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Allergener i denne ingrediensen"
                        }
                      },
                      required: ["name", "quantity"]
                    }
                  },
                  steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Fremgangsmåte steg for steg"
                  }
                },
                required: ["title", "description", "servings", "prep_time", "cook_time", "category", "ingredients", "steps"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_recipe" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "create_recipe") {
      throw new Error("Invalid response from AI");
    }

    const recipe = JSON.parse(toolCall.function.arguments);
    
    // Add recipe_type based on input
    recipe.recipe_type = recipeType;

    console.log("Generated recipe:", recipe.title);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-recipe:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
