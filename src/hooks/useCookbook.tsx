import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CookbookIngredient {
  id: string;
  cookbook_recipe_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  is_optional: boolean;
  sort_order: number;
}

export interface CookbookRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  steps: string[];
  image_url: string | null;
  source_recipe_id: string | null;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  fat_per_serving: number | null;
  carbs_per_serving: number | null;
  created_at: string;
  updated_at: string;
  ingredients?: CookbookIngredient[];
}

export interface CookbookRecipeInput {
  title: string;
  description?: string;
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  steps?: string[];
  image_url?: string;
  source_recipe_id?: string;
  calories_per_serving?: number;
  protein_per_serving?: number;
  fat_per_serving?: number;
  carbs_per_serving?: number;
  ingredients?: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    is_optional?: boolean;
    sort_order?: number;
  }>;
}

export const useCookbook = (userId: string | undefined) => {
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecipes = useCallback(async () => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_cookbook")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const ids = data.map(r => r.id);
        const { data: ingredients, error: ingError } = await supabase
          .from("user_cookbook_ingredients")
          .select("*")
          .in("cookbook_recipe_id", ids)
          .order("sort_order", { ascending: true });

        if (ingError) throw ingError;

        const withIngredients = data.map(recipe => ({
          ...recipe,
          steps: recipe.steps || [],
          ingredients: (ingredients || [])
            .filter(i => i.cookbook_recipe_id === recipe.id)
            .map(i => ({ ...i, is_optional: i.is_optional || false, sort_order: i.sort_order || 0 })),
        }));

        setRecipes(withIngredients);
      } else {
        setRecipes([]);
      }
    } catch (error: any) {
      console.error("Error fetching cookbook:", error);
      toast({ title: "Feil", description: "Kunne ikke hente kokebok", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addRecipe = async (input: CookbookRecipeInput): Promise<string | null> => {
    if (!userId) return null;

    try {
      const { ingredients, ...recipeData } = input;
      const { data, error } = await supabase
        .from("user_cookbook")
        .insert({ ...recipeData, user_id: userId, steps: recipeData.steps || [] })
        .select()
        .single();

      if (error) throw error;

      if (ingredients && ingredients.length > 0) {
        const { error: ingError } = await supabase
          .from("user_cookbook_ingredients")
          .insert(ingredients.map((ing, idx) => ({
            cookbook_recipe_id: data.id,
            name: ing.name,
            quantity: ing.quantity || null,
            unit: ing.unit || null,
            is_optional: ing.is_optional || false,
            sort_order: ing.sort_order ?? idx,
          })));

        if (ingError) throw ingError;
      }

      toast({ title: "Lagret!", description: `"${input.title}" lagt til i kokeboken` });
      await fetchRecipes();
      return data.id;
    } catch (error: any) {
      console.error("Error adding cookbook recipe:", error);
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const updateRecipe = async (id: string, input: Partial<CookbookRecipeInput>): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { ingredients, ...recipeData } = input;
      const { error } = await supabase
        .from("user_cookbook")
        .update(recipeData)
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      if (ingredients !== undefined) {
        // Delete existing and re-insert
        await supabase.from("user_cookbook_ingredients").delete().eq("cookbook_recipe_id", id);

        if (ingredients.length > 0) {
          const { error: ingError } = await supabase
            .from("user_cookbook_ingredients")
            .insert(ingredients.map((ing, idx) => ({
              cookbook_recipe_id: id,
              name: ing.name,
              quantity: ing.quantity || null,
              unit: ing.unit || null,
              is_optional: ing.is_optional || false,
              sort_order: ing.sort_order ?? idx,
            })));

          if (ingError) throw ingError;
        }
      }

      toast({ title: "Oppdatert!", description: "Oppskriften er lagret" });
      await fetchRecipes();
      return true;
    } catch (error: any) {
      console.error("Error updating cookbook recipe:", error);
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const deleteRecipe = async (id: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("user_cookbook")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Slettet", description: "Oppskriften er fjernet fra kokeboken" });
      await fetchRecipes();
      return true;
    } catch (error: any) {
      console.error("Error deleting cookbook recipe:", error);
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const saveExistingRecipe = async (recipe: {
    id: string;
    title: string;
    description?: string | null;
    servings?: number | null;
    prep_time?: number | null;
    cook_time?: number | null;
    steps?: string[];
    image_url?: string | null;
    calories_per_serving?: number | null;
    protein_per_serving?: number | null;
    fat_per_serving?: number | null;
    carbs_per_serving?: number | null;
    ingredients?: Array<{ name: string; quantity?: string | null; unit?: string | null; is_optional?: boolean }>;
  }): Promise<string | null> => {
    return addRecipe({
      title: recipe.title,
      description: recipe.description || undefined,
      servings: recipe.servings || undefined,
      prep_time: recipe.prep_time || undefined,
      cook_time: recipe.cook_time || undefined,
      steps: recipe.steps || [],
      image_url: recipe.image_url || undefined,
      source_recipe_id: recipe.id,
      calories_per_serving: recipe.calories_per_serving || undefined,
      protein_per_serving: recipe.protein_per_serving || undefined,
      fat_per_serving: recipe.fat_per_serving || undefined,
      carbs_per_serving: recipe.carbs_per_serving || undefined,
      ingredients: recipe.ingredients?.map((ing, idx) => ({
        name: ing.name,
        quantity: ing.quantity || undefined,
        unit: ing.unit || undefined,
        is_optional: ing.is_optional || false,
        sort_order: idx,
      })),
    });
  };

  const isInCookbook = (sourceRecipeId: string): boolean => {
    return recipes.some(r => r.source_recipe_id === sourceRecipeId);
  };

  return {
    recipes,
    loading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    saveExistingRecipe,
    isInCookbook,
    refetch: fetchRecipes,
  };
};
