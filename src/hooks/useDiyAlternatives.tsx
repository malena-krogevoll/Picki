import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiyRecipe {
  id: string;
  title: string;
  replaces: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  ingredients: {
    id: string;
    name: string;
    quantity: string | null;
    unit: string | null;
  }[];
}

// Mapping of product search terms to DIY recipe keywords
// This helps match user searches like "nugatti" to "sjokoladepålegg"
const PRODUCT_TO_DIY_KEYWORDS: Record<string, string[]> = {
  // Sjokoladepålegg
  "nutella": ["sjokoladepålegg", "nutella"],
  "nugatti": ["sjokoladepålegg", "nutella"],
  "sjokoladepålegg": ["sjokoladepålegg", "nutella"],
  "nøttepålegg": ["sjokoladepålegg", "nutella"],
  
  // Ketchup
  "ketchup": ["ketchup"],
  "tomatketchup": ["ketchup"],
  
  // Majones
  "majones": ["majones"],
  "mayonnaise": ["majones"],
  
  // Hummus
  "hummus": ["hummus"],
  
  // Syltetøy
  "syltetøy": ["syltetøy"],
  "jordbærsyltetøy": ["syltetøy"],
  "bringebærsyltetøy": ["syltetøy"],
  
  // Chips
  "chips": ["chips", "proteinsnacks"],
  "potetgull": ["chips"],
  
  // Pizzabunn
  "pizzabunn": ["pizzabunn"],
  "pizza": ["pizzabunn"],
  
  // Tortilla/lefser
  "tortilla": ["tortilla", "lomper", "pitabrød"],
  "lompe": ["tortilla", "lomper"],
  "lefse": ["tortilla", "lomper"],
  "pitabrød": ["tortilla", "pitabrød"],
  
  // Plantmelk
  "mandelmelk": ["plantemelk"],
  "havremelk": ["plantemelk"],
  "sojamelk": ["plantemelk"],
  "plantemelk": ["plantemelk"],
  
  // Godteri
  "gummibjørner": ["gummibjørner", "vingummi"],
  "vingummi": ["gummibjørner", "vingummi"],
  "seigmenn": ["gummibjørner", "vingummi"],
  
  // Sjokoladesnacks
  "smash": ["sjokoladesnacks"],
  "kvikk lunsj": ["sjokoladesnacks"],
  "sjokolade": ["sjokoladesnacks", "sjokoladepålegg"],
};

export const useDiyAlternatives = () => {
  const [diyRecipes, setDiyRecipes] = useState<DiyRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiyRecipes = async () => {
      try {
        const { data: recipes, error: recipesError } = await supabase
          .from("recipes")
          .select("id, title, replaces, description, prep_time, cook_time")
          .eq("recipe_type", "diy")
          .eq("status", "published")
          .not("replaces", "is", null);

        if (recipesError) throw recipesError;

        if (recipes && recipes.length > 0) {
          const recipeIds = recipes.map(r => r.id);
          
          const { data: ingredients, error: ingredientsError } = await supabase
            .from("recipe_ingredients")
            .select("id, recipe_id, name, quantity, unit")
            .in("recipe_id", recipeIds);

          if (ingredientsError) throw ingredientsError;

          const recipesWithIngredients: DiyRecipe[] = recipes.map(recipe => ({
            ...recipe,
            replaces: recipe.replaces!,
            ingredients: (ingredients || [])
              .filter(ing => ing.recipe_id === recipe.id)
              .map(ing => ({
                id: ing.id,
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
          }));

          setDiyRecipes(recipesWithIngredients);
        }
      } catch (error) {
        console.error("Error fetching DIY recipes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiyRecipes();
  }, []);

  /**
   * Find a matching DIY recipe for a given product search term
   */
  const findDiyAlternative = useMemo(() => {
    return (searchTerm: string): DiyRecipe | null => {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      
      // First, check direct keyword mapping
      const mappedKeywords = PRODUCT_TO_DIY_KEYWORDS[normalizedSearch];
      
      if (mappedKeywords) {
        for (const keyword of mappedKeywords) {
          const match = diyRecipes.find(recipe => 
            recipe.replaces.toLowerCase().includes(keyword)
          );
          if (match) return match;
        }
      }
      
      // Fallback: Check if any DIY recipe's "replaces" field contains the search term
      const directMatch = diyRecipes.find(recipe => {
        const replacesLower = recipe.replaces.toLowerCase();
        const titleLower = recipe.title.toLowerCase();
        return replacesLower.includes(normalizedSearch) || 
               titleLower.includes(normalizedSearch) ||
               normalizedSearch.includes(replacesLower.split(" ")[0]);
      });
      
      if (directMatch) return directMatch;
      
      // Check if any keyword in the mapping matches the search term
      for (const [productTerm, keywords] of Object.entries(PRODUCT_TO_DIY_KEYWORDS)) {
        if (normalizedSearch.includes(productTerm)) {
          for (const keyword of keywords) {
            const match = diyRecipes.find(recipe => 
              recipe.replaces.toLowerCase().includes(keyword)
            );
            if (match) return match;
          }
        }
      }
      
      return null;
    };
  }, [diyRecipes]);

  return {
    diyRecipes,
    loading,
    findDiyAlternative,
  };
};
