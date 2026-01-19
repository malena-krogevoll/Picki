import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const useFavoriteRecipes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_favorite_recipes")
        .select("recipe_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setFavorites(data?.map((f) => f.recipe_id) || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (recipeId: string) => favorites.includes(recipeId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (!user) {
        toast({
          title: "Logg inn",
          description: "Du må logge inn for å lagre favoritter",
          variant: "destructive",
        });
        return;
      }

      const isCurrentlyFavorite = isFavorite(recipeId);

      // Optimistic update
      if (isCurrentlyFavorite) {
        setFavorites((prev) => prev.filter((id) => id !== recipeId));
      } else {
        setFavorites((prev) => [...prev, recipeId]);
      }

      try {
        if (isCurrentlyFavorite) {
          const { error } = await supabase
            .from("user_favorite_recipes")
            .delete()
            .eq("user_id", user.id)
            .eq("recipe_id", recipeId);

          if (error) throw error;
          toast({
            title: "Fjernet fra favoritter",
            description: "Oppskriften er fjernet fra dine favoritter",
          });
        } else {
          const { error } = await supabase
            .from("user_favorite_recipes")
            .insert({ user_id: user.id, recipe_id: recipeId });

          if (error) throw error;
          toast({
            title: "Lagt til favoritter",
            description: "Oppskriften er lagret som favoritt",
          });
        }
      } catch (error) {
        // Revert optimistic update
        if (isCurrentlyFavorite) {
          setFavorites((prev) => [...prev, recipeId]);
        } else {
          setFavorites((prev) => prev.filter((id) => id !== recipeId));
        }
        console.error("Error toggling favorite:", error);
        toast({
          title: "Feil",
          description: "Kunne ikke oppdatere favoritter",
          variant: "destructive",
        });
      }
    },
    [user, isFavorite, toast]
  );

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
};
