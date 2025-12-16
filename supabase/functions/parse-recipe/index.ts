import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeText } = await req.json();

    if (!recipeText) {
      return new Response(
        JSON.stringify({ error: "Recipe text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `Du er en assistent som ekstraherer ingredienser fra oppskrifter.
Din oppgave er å lese oppskriften og finne alle ingredienser.

Regler:
- Returner kun ingrediensnavnet uten mengder (f.eks. "tomater" ikke "400g tomater")
- Returner kun matvarer som kan kjøpes i butikk
- Ignorer vann, salt og pepper (disse har folk hjemme)
- Kombiner lignende ingredienser (f.eks. hvis det står "2 ss olivenolje" og "1 ss olivenolje", bruk bare "olivenolje")
- Bruk norske navn
- Returner en array med ingredienser`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Ekstrahér ingredienser fra denne oppskriften:\n\n${recipeText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_ingredients",
              description: "Extract ingredients from a recipe",
              parameters: {
                type: "object",
                properties: {
                  ingredients: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of ingredient names without quantities"
                  }
                },
                required: ["ingredients"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_ingredients" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ ingredients: result.ingredients || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in parse-recipe function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", ingredients: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
