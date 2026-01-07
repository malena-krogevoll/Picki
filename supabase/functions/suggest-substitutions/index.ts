import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
  allergens?: string[];
}

interface UserPreferences {
  allergies: string[];
  diets: string[];
  other_preferences?: {
    organic?: boolean;
    lowest_price?: boolean;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, userPreferences } = await req.json() as { 
      ingredients: Ingredient[]; 
      userPreferences: UserPreferences | null;
    };

    if (!ingredients || !Array.isArray(ingredients)) {
      throw new Error("Ingredients array is required");
    }

    // If no user preferences, return original ingredients
    if (!userPreferences || (userPreferences.allergies.length === 0 && userPreferences.diets.length === 0)) {
      return new Response(JSON.stringify({ 
        substitutions: [],
        originalIngredients: ingredients 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du er en norsk ernæringsekspert som hjelper med å finne ingredienserstatninger.

Brukerens preferanser:
- Allergier: ${userPreferences.allergies.join(", ") || "Ingen"}
- Dietter: ${userPreferences.diets.join(", ") || "Ingen"}

Oppgave: Analyser ingrediensene og foreslå erstatninger for ingredienser som ikke passer brukerens preferanser.

Vanlige erstatninger:
- Kumelk → Havremelk, mandmelk, kokosmelk
- Smør → Plantemargarin, kokosolje
- Fløte → Havrefløte, kokosfløte
- Egg → Chifrø + vann (1:3), linfrø + vann, banan
- Hvetemel → Mandelmel, boveitemel, rismel
- Soyasaus → Kokosaminos
- Ost → Nøtteost, gjærkrydderopp

Returner KUN ingredienser som trenger erstatning.`;

    const ingredientsList = ingredients.map(i => 
      `${i.quantity || ""} ${i.unit || ""} ${i.name} ${i.allergens?.length ? `(allergener: ${i.allergens.join(", ")})` : ""}`
    ).join("\n");

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
          { role: "user", content: `Ingredienser:\n${ingredientsList}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_substitutions",
              description: "Foreslå erstatninger for ingredienser som ikke passer brukerens preferanser",
              parameters: {
                type: "object",
                properties: {
                  substitutions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_ingredient: { type: "string", description: "Original ingrediens" },
                        reason: { type: "string", description: "Hvorfor erstatning trengs (f.eks. 'inneholder melk')" },
                        alternatives: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Erstatningsingrediens" },
                              quantity: { type: "string", description: "Mengde" },
                              unit: { type: "string", description: "Enhet" },
                              note: { type: "string", description: "Tips for bruk" }
                            },
                            required: ["name"]
                          }
                        }
                      },
                      required: ["original_ingredient", "reason", "alternatives"]
                    }
                  }
                },
                required: ["substitutions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_substitutions" } }
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
    
    if (!toolCall || toolCall.function.name !== "suggest_substitutions") {
      // No substitutions needed
      return new Response(JSON.stringify({ 
        substitutions: [],
        originalIngredients: ingredients 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    console.log("Generated substitutions:", result.substitutions?.length || 0);

    return new Response(JSON.stringify({ 
      substitutions: result.substitutions || [],
      originalIngredients: ingredients 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-substitutions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
