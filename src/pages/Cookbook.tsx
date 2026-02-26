import React, { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useCookbook, CookbookRecipe, CookbookRecipeInput } from "@/hooks/useCookbook";
import { useFavoriteRecipes } from "@/hooks/useFavoriteRecipes";
import { useRecipes, Recipe } from "@/hooks/useRecipes";
import { RecipeDetailEnhanced } from "@/components/RecipeDetailEnhanced";
import { CookbookRecipeForm } from "@/components/CookbookRecipeForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Clock, Users, Pencil, Trash2, ArrowLeft, AlertCircle, ChefHat, Heart, Minus, Flame, Beef, Droplets, Wheat } from "lucide-react";
import { useNavigate } from "react-router-dom";

type View = "list" | "create" | "edit" | "detail";

const Cookbook = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recipes, loading, addRecipe, updateRecipe, deleteRecipe, saveExistingRecipe } = useCookbook(user?.id);
  const { favorites, isFavorite, toggleFavorite } = useFavoriteRecipes();
  const { recipes: allRecipes, loading: recipesLoading } = useRecipes();
  const [view, setView] = useState<View>("list");
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("mine");
  const [selectedFavorite, setSelectedFavorite] = useState<Recipe | null>(null);

  const favoriteRecipes = useMemo(() => {
    return allRecipes.filter(r => favorites.includes(r.id));
  }, [allRecipes, favorites]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Du må logge inn for å bruke kokeboken.
              <Button variant="link" onClick={() => navigate("/auth")} className="ml-1 p-0 h-auto">
                Logg inn
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const handleCreate = async (input: CookbookRecipeInput) => {
    const id = await addRecipe(input);
    if (id) setView("list");
    return id;
  };

  const handleUpdate = async (input: CookbookRecipeInput) => {
    if (!selectedRecipe) return false;
    const ok = await updateRecipe(selectedRecipe.id, input);
    if (ok) setView("list");
    return ok;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRecipe(deleteTarget);
    setDeleteTarget(null);
    if (selectedRecipe?.id === deleteTarget) {
      setSelectedRecipe(null);
      setView("list");
    }
  };

  const openDetail = (recipe: CookbookRecipe) => {
    setSelectedRecipe(recipe);
    setView("detail");
  };

  const openEdit = (recipe: CookbookRecipe) => {
    setSelectedRecipe(recipe);
    setView("edit");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
        <main className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        {selectedFavorite ? (
          <RecipeDetailEnhanced
            recipe={selectedFavorite as any}
            onBack={() => setSelectedFavorite(null)}
            isFavorite={isFavorite(selectedFavorite.id)}
            onToggleFavorite={toggleFavorite}
          />
        ) : view === "list" && (
          <>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kokebok</h1>
              </div>
              <Button size="sm" onClick={() => { setSelectedRecipe(null); setView("create"); }}>
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Ny oppskrift</span>
                <span className="sm:hidden">Ny</span>
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mine" className="gap-1.5 text-sm">
                  <ChefHat className="h-4 w-4" />
                  Mine
                </TabsTrigger>
                <TabsTrigger value="favoritter" className="gap-1.5 text-sm">
                  <Heart className="h-4 w-4" />
                  Favoritter
                  {favorites.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                      {favorites.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mine">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
                  </div>
                ) : recipes.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center px-6">
                      <ChefHat className="h-12 w-12 text-primary/60 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Velkommen til din kokebok!</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        Her samler du alle oppskriftene dine på ett sted.
                      </p>
                      <ul className="text-sm text-muted-foreground text-left space-y-1.5 my-3">
                        <li>✍️ Lag egne oppskrifter med ingredienser og fremgangsmåte</li>
                        <li>📥 Lagre oppskrifter du finner i exploreren</li>
                        <li>✏️ Tilpass ingredienser og porsjoner etter eget ønske</li>
                        <li>🛒 Legg ingredienser rett i handlelisten</li>
                      </ul>
                      <Button size="sm" onClick={() => setView("create")} className="mt-2">
                        <Plus className="h-4 w-4 mr-1" />
                        Lag din første oppskrift
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recipes.map(recipe => (
                      <Card
                        key={recipe.id}
                        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                        onClick={() => openDetail(recipe)}
                      >
                        <div className="flex">
                          {recipe.image_url && (
                            <img src={recipe.image_url} alt={recipe.title} className="w-24 h-full object-cover flex-shrink-0" />
                          )}
                          <CardContent className="p-3 flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{recipe.title}</h3>
                            {recipe.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{recipe.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {(recipe.prep_time || recipe.cook_time) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                                </span>
                              )}
                              {recipe.servings && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {recipe.servings} pers
                                </span>
                              )}
                              {recipe.source_recipe_id && (
                                <Badge variant="outline" className="text-xs py-0">Fra explorer</Badge>
                              )}
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="favoritter">
                {recipesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                  </div>
                ) : favoriteRecipes.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center px-6">
                      <Heart className="h-12 w-12 text-primary/60 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Dine favorittoppskrifter</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        Her dukker oppskriftene du liker best opp.
                      </p>
                      <ul className="text-sm text-muted-foreground text-left space-y-1.5 my-3">
                        <li>❤️ Trykk på hjertet i oppskrift-exploreren for å lagre</li>
                        <li>📋 Finn dem raskt igjen her i kokeboken</li>
                        <li>🛒 Legg ingredienser rett i handlelisten</li>
                      </ul>
                      <Button variant="outline" size="sm" onClick={() => navigate("/dinner-explorer")} className="mt-2">
                        Utforsk oppskrifter
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {favoriteRecipes.map(recipe => (
                      <Card
                        key={recipe.id}
                        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                        onClick={() => setSelectedFavorite(recipe)}
                      >
                        <div className="flex">
                          {recipe.image_url && (
                            <img src={recipe.image_url} alt={recipe.title} className="w-28 h-full object-cover flex-shrink-0" />
                          )}
                          <CardContent className="p-3 flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{recipe.title}</h3>
                            {recipe.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{recipe.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {((recipe.prep_time || 0) + (recipe.cook_time || 0)) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                                </span>
                              )}
                              {recipe.servings && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {recipe.servings} pers
                                </span>
                              )}
                              <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {view === "create" && (
          <CookbookRecipeForm onSave={handleCreate} onCancel={() => setView("list")} />
        )}

        {view === "edit" && selectedRecipe && (
          <CookbookRecipeForm recipe={selectedRecipe} onSave={handleUpdate} onCancel={() => setView("detail")} />
        )}

        {view === "detail" && selectedRecipe && (
          <CookbookRecipeDetail
            recipe={selectedRecipe}
            onBack={() => { setSelectedRecipe(null); setView("list"); }}
            onEdit={() => openEdit(selectedRecipe)}
            onDelete={() => setDeleteTarget(selectedRecipe.id)}
          />
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slett oppskrift?</AlertDialogTitle>
              <AlertDialogDescription>
                Denne handlingen kan ikke angres. Oppskriften fjernes permanent fra kokeboken.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Slett
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

// Detail sub-component
const CookbookRecipeDetail = ({
  recipe,
  onBack,
  onEdit,
  onDelete,
}: {
  recipe: CookbookRecipe;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { user } = useAuth();
  const { lists, addItem } = useShoppingList(user?.id);
  const { toast } = useToast();
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const originalServings = recipe.servings || 4;
  const [servings, setServings] = useState<number>(originalServings);
  const scaleFactor = servings / originalServings;
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    new Set(recipe.ingredients?.map(i => i.name) || [])
  );

  const scaleQuantity = (quantity: string | null): string => {
    if (!quantity) return "";
    const numMatch = quantity.match(/^([\d.,\/]+)\s*(.*)$/);
    if (!numMatch) return quantity;
    let numPart = numMatch[1];
    const textPart = numMatch[2];
    if (numPart.includes("/")) {
      const [numerator, denominator] = numPart.split("/").map(n => parseFloat(n.replace(",", ".")));
      const scaledValue = (numerator / denominator) * scaleFactor;
      return scaledValue === Math.floor(scaledValue)
        ? `${scaledValue}${textPart ? " " + textPart : ""}`
        : `${scaledValue.toFixed(1).replace(".", ",")}${textPart ? " " + textPart : ""}`;
    }
    const num = parseFloat(numPart.replace(",", "."));
    if (isNaN(num)) return quantity;
    const scaledValue = num * scaleFactor;
    return scaledValue === Math.floor(scaledValue)
      ? `${scaledValue}${textPart ? " " + textPart : ""}`
      : `${scaledValue.toFixed(1).replace(".", ",")}${textPart ? " " + textPart : ""}`;
  };

  const toggleIngredient = (name: string) => {
    const next = new Set(selectedIngredients);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedIngredients(next);
  };

  const handleAddToList = async () => {
    if (lists.length === 0) {
      toast({ title: "Ingen handleliste", description: "Opprett en handleliste først", variant: "destructive" });
      return;
    }
    const activeList = lists[0];
    for (const name of selectedIngredients) {
      await addItem(activeList.id, name);
    }
    toast({ title: "Lagt til", description: `${selectedIngredients.size} ingredienser lagt til handlelisten` });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Tilbake
        </Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {recipe.image_url && (
        <div className="rounded-xl overflow-hidden shadow-lg">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-48 md:h-64 object-cover" />
        </div>
      )}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.description && <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>}
        <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalTime} min
            </span>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-medium min-w-[3ch] text-center">{servings}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setServings(Math.min(20, servings + 1))}
                disabled={servings >= 20}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <span>porsjoner</span>
            </div>
          )}
        </div>
      </div>

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-lg mb-3">Ingredienser</h2>
            <p className="text-sm text-muted-foreground mb-3">Huk av ingredienser du allerede har</p>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    id={`cb-ing-${i}`}
                    checked={selectedIngredients.has(ing.name)}
                    onCheckedChange={() => toggleIngredient(ing.name)}
                  />
                  <label htmlFor={`cb-ing-${i}`} className="cursor-pointer">
                    {ing.quantity && <span className="font-medium">{scaleQuantity(ing.quantity)} </span>}
                    {ing.unit && <span>{ing.unit} </span>}
                    <span>{ing.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              onClick={handleAddToList}
              className="w-full mt-4"
              disabled={selectedIngredients.size === 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              Legg til {selectedIngredients.size} i handlelisten
            </Button>
          </CardContent>
        </Card>
      )}

      {recipe.steps && recipe.steps.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-lg mb-3">Fremgangsmåte</h2>
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {i + 1}
                  </span>
                  <p className="text-foreground pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Nutrition Card */}
      {(recipe.calories_per_serving || recipe.protein_per_serving || recipe.fat_per_serving || recipe.carbs_per_serving) && (
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Næringsinnhold per porsjon
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recipe.calories_per_serving && (
                <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                  <Flame className="h-5 w-5 text-orange-500 mb-1" />
                  <span className="text-lg font-bold">{Math.round(recipe.calories_per_serving * scaleFactor)}</span>
                  <span className="text-xs text-muted-foreground">kcal</span>
                </div>
              )}
              {recipe.protein_per_serving && (
                <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                  <Beef className="h-5 w-5 text-red-500 mb-1" />
                  <span className="text-lg font-bold">{(recipe.protein_per_serving * scaleFactor).toFixed(1)}g</span>
                  <span className="text-xs text-muted-foreground">Protein</span>
                </div>
              )}
              {recipe.fat_per_serving && (
                <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                  <Droplets className="h-5 w-5 text-yellow-500 mb-1" />
                  <span className="text-lg font-bold">{(recipe.fat_per_serving * scaleFactor).toFixed(1)}g</span>
                  <span className="text-xs text-muted-foreground">Fett</span>
                </div>
              )}
              {recipe.carbs_per_serving && (
                <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                  <Wheat className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="text-lg font-bold">{(recipe.carbs_per_serving * scaleFactor).toFixed(1)}g</span>
                  <span className="text-xs text-muted-foreground">Karbo</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Cookbook;
