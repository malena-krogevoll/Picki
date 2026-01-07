import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  allergens: string[];
  is_optional: boolean;
  base_product_id: string | null;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  category: string;
  recipe_type: "dinner" | "base" | "diy";
  status: "draft" | "published";
  allergens: string[];
  diet_tags: string[];
  steps: string[];
  image_url: string | null;
  replaces: string | null;
  created_at: string;
  ingredients?: RecipeIngredient[];
}

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (recipesError) throw recipesError;

      if (recipesData && recipesData.length > 0) {
        const recipeIds = recipesData.map(r => r.id);
        
        const { data: ingredientsData, error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .select("*")
          .in("recipe_id", recipeIds);

        if (ingredientsError) throw ingredientsError;

        const recipesWithIngredients = recipesData.map(recipe => ({
          ...recipe,
          recipe_type: recipe.recipe_type as "dinner" | "base" | "diy",
          status: recipe.status as "draft" | "published",
          allergens: recipe.allergens || [],
          diet_tags: recipe.diet_tags || [],
          steps: recipe.steps || [],
          ingredients: (ingredientsData || [])
            .filter(ing => ing.recipe_id === recipe.id)
            .map(ing => ({
              ...ing,
              allergens: ing.allergens || [],
              is_optional: ing.is_optional || false,
            }))
        }));

        setRecipes(recipesWithIngredients);
      } else {
        setRecipes([]);
      }
    } catch (error: any) {
      console.error("Error fetching recipes:", error);
      toast({
        title: "Feil ved henting av oppskrifter",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const getRecipesByType = (type: "dinner" | "base" | "diy") => {
    return recipes.filter(r => r.recipe_type === type);
  };

  const filterRecipesByPreferences = (
    recipesToFilter: Recipe[],
    preferences: { allergies: string[]; diets: string[] } | null
  ) => {
    if (!preferences || (preferences.allergies.length === 0 && preferences.diets.length === 0)) {
      return recipesToFilter;
    }

    return recipesToFilter.map(recipe => {
      const allergenWarnings = recipe.allergens.filter(allergen =>
        preferences.allergies.some(userAllergen =>
          allergen.toLowerCase().includes(userAllergen.toLowerCase()) ||
          userAllergen.toLowerCase().includes(allergen.toLowerCase())
        )
      );

      const dietMatches = recipe.diet_tags.filter(tag =>
        preferences.diets.some(diet =>
          tag.toLowerCase().includes(diet.toLowerCase())
        )
      );

      return {
        ...recipe,
        _allergenWarnings: allergenWarnings,
        _dietMatches: dietMatches,
        _hasWarnings: allergenWarnings.length > 0,
      };
    }).sort((a, b) => {
      // Sort recipes without warnings first
      if (a._hasWarnings && !b._hasWarnings) return 1;
      if (!a._hasWarnings && b._hasWarnings) return -1;
      return 0;
    });
  };

  return {
    recipes,
    loading,
    refetch: fetchRecipes,
    getRecipesByType,
    filterRecipesByPreferences,
  };
};
