import React, { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { RecipeCardEnhanced } from "@/components/RecipeCardEnhanced";
import { RecipeDetailEnhanced } from "@/components/RecipeDetailEnhanced";
import { RecipeFilters } from "@/components/RecipeFilters";
import { useRecipes, Recipe } from "@/hooks/useRecipes";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFavoriteRecipes } from "@/hooks/useFavoriteRecipes";
import { useRecipeHistory } from "@/hooks/useRecipeHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, UtensilsCrossed, Soup, AlertCircle, Coffee, Heart, History } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const DinnerExplorer = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { recipes, loading, getRecipesByType, filterRecipesByPreferences } = useRecipes();
  const { favorites, isFavorite, toggleFavorite } = useFavoriteRecipes();
  const { history } = useRecipeHistory();
  
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState("dinner");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(false);
  const [showOnlyQuick, setShowOnlyQuick] = useState(false);

  // Reset filters when tab changes
  useEffect(() => {
    setSelectedCategory(null);
    setShowOnlyQuick(false);
    setShowOnlyCompatible(false);
    setSearchQuery("");
  }, [activeTab]);

  const userPreferences = profile?.preferences ? {
    allergies: profile.preferences.allergies || [],
    diets: profile.preferences.diets || [],
  } : null;

  const hasPreferences = userPreferences && 
    (userPreferences.allergies.length > 0 || userPreferences.diets.length > 0);

  // Get favorite recipes
  const favoriteRecipes = useMemo(() => {
    return recipes.filter(r => favorites.includes(r.id));
  }, [recipes, favorites]);

  // Check if current tab is a special tab (favorites/history)
  const isSpecialTab = activeTab === "favorites" || activeTab === "history";

  const filteredRecipes = useMemo(() => {
    // Handle special tabs
    if (activeTab === "favorites") {
      let result = favoriteRecipes;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(r => 
          r.title.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
        );
      }
      return result;
    }

    let result = getRecipesByType(activeTab as "dinner" | "base" | "diy" | "breakfast");
    
    // Apply user preference filtering
    result = filterRecipesByPreferences(result, userPreferences);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter(r => r.category === selectedCategory);
    }

    // Filter by compatibility
    if (showOnlyCompatible && hasPreferences) {
      result = result.filter(r => !(r as any)._hasWarnings);
    }

    // Filter by quick recipes (under 30 min)
    if (showOnlyQuick) {
      result = result.filter(r => {
        const totalTime = (r.prep_time || 0) + (r.cook_time || 0);
        return totalTime > 0 && totalTime < 30;
      });
    }

    return result;
  }, [recipes, activeTab, searchQuery, selectedCategory, showOnlyCompatible, showOnlyQuick, userPreferences, favoriteRecipes]);

  const categories = useMemo(() => {
    if (isSpecialTab) return [];
    const typeRecipes = getRecipesByType(activeTab as "dinner" | "base" | "diy" | "breakfast");
    return [...new Set(typeRecipes.map(r => r.category))];
  }, [recipes, activeTab, isSpecialTab]);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "dinner": return "Middager";
      case "breakfast": return "Frokost/Lunsj";
      case "base": return "Baseprodukter";
      case "diy": return "DIY";
      case "favorites": return "Favoritter";
      case "history": return "Historikk";
      default: return tab;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {!selectedRecipe ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                Oppskrift-explorer
              </h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex flex-col gap-4">
                <TabsList className="grid w-full grid-cols-4 max-w-lg">
                  <TabsTrigger value="dinner" className="gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    <span className="hidden sm:inline">Middager</span>
                  </TabsTrigger>
                  <TabsTrigger value="breakfast" className="gap-2">
                    <Coffee className="h-4 w-4" />
                    <span className="hidden sm:inline">Frokost</span>
                  </TabsTrigger>
                  <TabsTrigger value="base" className="gap-2">
                    <Soup className="h-4 w-4" />
                    <span className="hidden sm:inline">Base</span>
                  </TabsTrigger>
                  <TabsTrigger value="diy" className="gap-2">
                    <ChefHat className="h-4 w-4" />
                    <span className="hidden sm:inline">DIY</span>
                  </TabsTrigger>
                </TabsList>

                {user && (
                  <TabsList className="grid w-full grid-cols-2 max-w-xs">
                    <TabsTrigger value="favorites" className="gap-2">
                      <Heart className="h-4 w-4" />
                      <span className="hidden sm:inline">Favoritter</span>
                      {favorites.length > 0 && (
                        <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                          {favorites.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                      <History className="h-4 w-4" />
                      <span className="hidden sm:inline">Historikk</span>
                    </TabsTrigger>
                  </TabsList>
                )}
              </div>

              {!isSpecialTab && (
                <RecipeFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  categories={categories}
                  showOnlyCompatible={showOnlyCompatible}
                  onCompatibleChange={setShowOnlyCompatible}
                  hasPreferences={!!hasPreferences}
                  showOnlyQuick={showOnlyQuick}
                  onQuickChange={setShowOnlyQuick}
                  activeTab={activeTab}
                />
              )}

              {["dinner", "breakfast", "base", "diy"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {filteredRecipes.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {recipes.length === 0
                          ? `Ingen ${getTabTitle(tab).toLowerCase()} tilgjengelig ennå. Oppskrifter vil bli lagt til snart!`
                          : "Ingen oppskrifter matcher dine filtre. Prøv å fjerne noen filtre."}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredRecipes.map((recipe) => (
                        <RecipeCardEnhanced
                          key={recipe.id}
                          recipe={recipe}
                          onClick={() => setSelectedRecipe(recipe)}
                          isFavorite={isFavorite(recipe.id)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}

              <TabsContent value="favorites">
                {!user ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Logg inn for å se dine favoritter.
                    </AlertDescription>
                  </Alert>
                ) : favoriteRecipes.length === 0 ? (
                  <Alert>
                    <Heart className="h-4 w-4" />
                    <AlertDescription>
                      Du har ingen favoritter ennå. Trykk på hjertet på oppskrifter du liker!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteRecipes.map((recipe) => (
                      <RecipeCardEnhanced
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => setSelectedRecipe(recipe)}
                        isFavorite={true}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {!user ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Logg inn for å se din oppskriftshistorikk.
                    </AlertDescription>
                  </Alert>
                ) : history.length === 0 ? (
                  <Alert>
                    <History className="h-4 w-4" />
                    <AlertDescription>
                      Du har ingen oppskriftshistorikk ennå. Fullførte handlelister med oppskrifter vises her.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    {history.map((entry) => (
                      <div key={entry.id} className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.completed_at), "d. MMMM yyyy", { locale: nb })}
                          {entry.servings && ` • ${entry.servings} porsjoner`}
                        </p>
                        {entry.recipe && (
                          <RecipeCardEnhanced
                            recipe={entry.recipe as any}
                            onClick={() => setSelectedRecipe(entry.recipe as Recipe)}
                            isFavorite={isFavorite(entry.recipe.id)}
                            onToggleFavorite={toggleFavorite}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <RecipeDetailEnhanced
            recipe={selectedRecipe as any}
            onBack={() => setSelectedRecipe(null)}
            isFavorite={isFavorite(selectedRecipe.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>
    </div>
  );
};

export default DinnerExplorer;
