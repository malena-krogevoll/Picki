import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { RecipeCardEnhanced } from "@/components/RecipeCardEnhanced";
import { RecipeDetailEnhanced } from "@/components/RecipeDetailEnhanced";
import { RecipeFilters } from "@/components/RecipeFilters";
import { useRecipes, Recipe } from "@/hooks/useRecipes";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, UtensilsCrossed, Soup, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DinnerExplorer = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { recipes, loading, getRecipesByType, filterRecipesByPreferences } = useRecipes();
  
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState("dinner");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(false);
  const [showOnlyQuick, setShowOnlyQuick] = useState(false);

  const userPreferences = profile?.preferences ? {
    allergies: profile.preferences.allergies || [],
    diets: profile.preferences.diets || [],
  } : null;

  const hasPreferences = userPreferences && 
    (userPreferences.allergies.length > 0 || userPreferences.diets.length > 0);

  const filteredRecipes = useMemo(() => {
    let result = getRecipesByType(activeTab as "dinner" | "base" | "diy");
    
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
  }, [recipes, activeTab, searchQuery, selectedCategory, showOnlyCompatible, showOnlyQuick, userPreferences]);

  const categories = useMemo(() => {
    const typeRecipes = getRecipesByType(activeTab as "dinner" | "base" | "diy");
    return [...new Set(typeRecipes.map(r => r.category))];
  }, [recipes, activeTab]);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "dinner": return "Middager";
      case "base": return "Baseprodukter";
      case "diy": return "DIY";
      default: return tab;
    }
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case "dinner": return "Renvare-middager med enkle ingredienser";
      case "base": return "Grunnoppskrifter som buljong, pesto og sauser";
      case "diy": return "Hjemmelagde alternativer til ferdigprodukter";
      default: return "";
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
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Middag-explorer
              </h1>
              <p className="text-muted-foreground">
                Oppskrifter laget med renvarer - enkle ingredienser uten tilsetningsstoffer
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="dinner" className="gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  Middager
                </TabsTrigger>
                <TabsTrigger value="base" className="gap-2">
                  <Soup className="h-4 w-4" />
                  Base
                </TabsTrigger>
                <TabsTrigger value="diy" className="gap-2">
                  <ChefHat className="h-4 w-4" />
                  DIY
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {getTabDescription(activeTab)}
                </p>

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
              </div>

              {["dinner", "base", "diy"].map((tab) => (
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
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <RecipeDetailEnhanced
            recipe={selectedRecipe as any}
            onBack={() => setSelectedRecipe(null)}
          />
        )}
      </main>
    </div>
  );
};

export default DinnerExplorer;
