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

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { recipeId, title, category, recipeType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a detailed prompt for food photography
    const categoryContext = getCategoryContext(category, recipeType);
    const prompt = `Professional food photography of ${title}. ${categoryContext} 
    Beautiful plating, natural lighting from the side, shallow depth of field, 
    rustic wooden table background with fresh ingredients scattered around. 
    Appetizing, Instagram-worthy, magazine quality. Ultra high resolution. 16:9 aspect ratio hero image.`;

    console.log(`Generating image for: ${title}`);
    console.log(`Prompt: ${prompt}`);

    // Call Lovable AI Gateway for image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageBase64) {
      throw new Error("No image generated");
    }

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Generate a clean filename
    const cleanTitle = title
      .toLowerCase()
      .replace(/[æ]/g, "ae")
      .replace(/[ø]/g, "o")
      .replace(/[å]/g, "a")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    const fileName = `recipes/${cleanTitle}-${recipeId.slice(0, 8)}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    // Update recipe with new image URL
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ image_url: imageUrl })
      .eq("id", recipeId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update recipe: ${updateError.message}`);
    }

    console.log(`Successfully generated and saved image for: ${title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        recipeId,
        title 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getCategoryContext(category: string, recipeType: string): string {
  const contexts: Record<string, string> = {
    "Frokost": "Breakfast setting, morning light, coffee cup in background, fresh and energizing.",
    "Fisk": "Fresh seafood, lemon wedges, dill garnish, light Mediterranean style.",
    "Kylling": "Golden crispy chicken, herbs, warm comfort food feeling.",
    "Kjøtt": "Hearty meat dish, rich colors, satisfying portions.",
    "Vegetar": "Colorful vegetables, fresh herbs, vibrant and healthy looking.",
    "Pasta": "Steaming pasta, rich sauce, parmesan shavings, Italian style.",
    "Suppe": "Warm soup in rustic bowl, steam rising, crusty bread on side.",
    "Supper": "Warm soup in rustic bowl, steam rising, crusty bread on side.",
    "Hurtigmat": "Quick comfort food, casual setting, appetizing and fun.",
    "Sauser": "Smooth sauce in small bowl, herbs, cooking ingredients around.",
    "Grunnoppskrifter": "Basic cooking preparation, clean and professional.",
    "Bakst": "Fresh baked goods, golden crust, flour dusted surface.",
    "Drikke": "Refreshing beverage, condensation on glass, fruits garnish.",
    "DIY": "Homemade preparation, hands-on cooking, artisanal feel.",
  };

  return contexts[category] || contexts[recipeType] || "Delicious homemade food, appetizing presentation.";
}
