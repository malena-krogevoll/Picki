import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Recipe } from "@/hooks/useRecipes";

interface RecipeHistoryEntry {
  id: string;
  recipe_id: string;
  shopping_list_id: string;
  completed_at: string;
  servings: number | null;
  recipe?: Recipe;
}

export const useRecipeHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<RecipeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_recipe_history")
        .select(`
          id,
          recipe_id,
          shopping_list_id,
          completed_at,
          servings,
          recipes (
            id,
            title,
            description,
            image_url,
            category,
            recipe_type,
            prep_time,
            cook_time,
            servings,
            calories_per_serving,
            protein_per_serving,
            fat_per_serving,
            carbs_per_serving,
            allergens,
            diet_tags,
            steps
          )
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedHistory = data?.map((entry) => ({
        ...entry,
        recipe: entry.recipes as unknown as Recipe,
      })) || [];

      setHistory(formattedHistory);
    } catch (error) {
      console.error("Error fetching recipe history:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addToHistory = useCallback(
    async (recipeId: string, shoppingListId: string, servings?: number) => {
      if (!user) return;

      try {
        const { error } = await supabase.from("user_recipe_history").insert({
          user_id: user.id,
          recipe_id: recipeId,
          shopping_list_id: shoppingListId,
          servings,
          completed_at: new Date().toISOString(),
        });

        if (error) throw error;
        await fetchHistory();
      } catch (error) {
        console.error("Error adding to recipe history:", error);
      }
    },
    [user, fetchHistory]
  );

  return {
    history,
    loading,
    addToHistory,
    refetch: fetchHistory,
  };
};
