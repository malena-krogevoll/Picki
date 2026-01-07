import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Clock, Users, Plus, AlertTriangle, Leaf, Wand2, Loader2, Minus } from "lucide-react";
import { Recipe, RecipeIngredient } from "@/hooks/useRecipes";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Substitution {
  original_ingredient: string;
  reason: string;
  alternatives: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    note?: string;
  }>;
}

interface RecipeDetailEnhancedProps {
  recipe: Recipe & { 
    _allergenWarnings?: string[]; 
    _dietMatches?: string[];
    _hasWarnings?: boolean;
  };
  onBack: () => void;
}

export const RecipeDetailEnhanced = ({ recipe, onBack }: RecipeDetailEnhancedProps) => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  
  // For dinner recipes, use household_size as default. For base/diy, use recipe's servings.
  const isDinnerRecipe = recipe.recipe_type === "dinner";
  const defaultServings = isDinnerRecipe 
    ? (profile?.preferences?.household_size || recipe.servings || 4)
    : (recipe.servings || 1);
  
  const [servings, setServings] = useState<number>(defaultServings);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    new Set(recipe.ingredients?.map(i => i.name) || [])
  );
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loadingSubstitutions, setLoadingSubstitutions] = useState(false);
  const [appliedSubstitutions, setAppliedSubstitutions] = useState<Map<string, string>>(new Map());
  const { lists, addItem } = useShoppingList(user?.id);
  const { toast } = useToast();
  
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const hasWarnings = recipe._hasWarnings || false;
  const originalServings = recipe.servings || 4;
  const scaleFactor = servings / originalServings;
  
  // Scale ingredient quantity
  const scaleQuantity = (quantity: string | null): string => {
    if (!quantity) return "";
    
    // Try to parse the quantity as a number
    const numMatch = quantity.match(/^([\d.,\/]+)\s*(.*)$/);
    if (!numMatch) return quantity;
    
    let numPart = numMatch[1];
    const textPart = numMatch[2];
    
    // Handle fractions like "1/2"
    if (numPart.includes("/")) {
      const [numerator, denominator] = numPart.split("/").map(n => parseFloat(n.replace(",", ".")));
      const scaledValue = (numerator / denominator) * scaleFactor;
      
      // Format nicely
      if (scaledValue === Math.floor(scaledValue)) {
        return `${scaledValue}${textPart ? " " + textPart : ""}`;
      }
      return `${scaledValue.toFixed(1).replace(".", ",")}${textPart ? " " + textPart : ""}`;
    }
    
    const num = parseFloat(numPart.replace(",", "."));
    if (isNaN(num)) return quantity;
    
    const scaledValue = num * scaleFactor;
    
    // Format: use whole numbers when possible, otherwise 1 decimal
    if (scaledValue === Math.floor(scaledValue)) {
      return `${scaledValue}${textPart ? " " + textPart : ""}`;
    }
    return `${scaledValue.toFixed(1).replace(".", ",")}${textPart ? " " + textPart : ""}`;
  };

  const toggleIngredient = (ingredientName: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(ingredientName)) {
      newSelected.delete(ingredientName);
    } else {
      newSelected.add(ingredientName);
    }
    setSelectedIngredients(newSelected);
  };

  const handleSuggestSubstitutions = async () => {
    if (!profile?.preferences) {
      toast({
        title: "Ingen preferanser",
        description: "Legg til allergier eller dietter i profilen din først",
        variant: "destructive",
      });
      return;
    }

    setLoadingSubstitutions(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-substitutions", {
        body: {
          ingredients: recipe.ingredients?.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            allergens: i.allergens,
          })) || [],
          userPreferences: profile.preferences,
        },
      });

      if (error) throw error;

      if (data.substitutions && data.substitutions.length > 0) {
        setSubstitutions(data.substitutions);
        toast({
          title: "Erstatninger funnet",
          description: `${data.substitutions.length} ingrediens(er) kan erstattes`,
        });
      } else {
        toast({
          title: "Ingen erstatninger nødvendig",
          description: "Alle ingredienser passer til dine preferanser",
        });
      }
    } catch (error: any) {
      console.error("Error suggesting substitutions:", error);
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke hente erstatningsforslag",
        variant: "destructive",
      });
    } finally {
      setLoadingSubstitutions(false);
    }
  };

  const applySubstitution = (originalIngredient: string, newIngredient: string) => {
    const newApplied = new Map(appliedSubstitutions);
    newApplied.set(originalIngredient, newIngredient);
    setAppliedSubstitutions(newApplied);
    
    // Update selection
    const newSelected = new Set(selectedIngredients);
    newSelected.delete(originalIngredient);
    newSelected.add(newIngredient);
    setSelectedIngredients(newSelected);
  };

  const getDisplayIngredient = (ingredient: RecipeIngredient) => {
    const substituted = appliedSubstitutions.get(ingredient.name);
    if (substituted) {
      return { name: substituted, isSubstituted: true, original: ingredient.name };
    }
    return { name: ingredient.name, isSubstituted: false };
  };

  const handleAddToList = async () => {
    if (lists.length === 0) {
      toast({
        title: "Ingen handleliste",
        description: "Opprett en handleliste først",
        variant: "destructive",
      });
      return;
    }

    const activeList = lists[0];

    try {
      for (const ingredientName of selectedIngredients) {
        await addItem(activeList.id, ingredientName);
      }

      toast({
        title: "Ingredienser lagt til",
        description: `${selectedIngredients.size} ingredienser er lagt til handlelisten`,
      });

      onBack();
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke legge til ingredienser",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbake til oppskrifter
      </Button>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-bold text-foreground">{recipe.title}</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-4">{recipe.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">{recipe.category}</Badge>
            {recipe.diet_tags.map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1 bg-green-50 border-green-200 text-green-700">
                <Leaf className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex gap-6 text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Total tid: {totalTime} min</span>
              </div>
            )}
            {isDinnerRecipe ? (
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
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
            ) : recipe.servings ? (
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{recipe.servings} porsjoner</span>
              </div>
            ) : null}
          </div>
        </div>

        {hasWarnings && recipe._allergenWarnings && recipe._allergenWarnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Allergenadvarsel</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>Denne oppskriften inneholder: {recipe._allergenWarnings.join(", ")}</span>
              {profile?.preferences && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSuggestSubstitutions}
                  disabled={loadingSubstitutions}
                  className="w-fit"
                >
                  {loadingSubstitutions ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Tilpass til meg
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {substitutions.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wand2 className="h-5 w-5 text-primary" />
                Foreslåtte erstatninger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {substitutions.map((sub, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="font-medium">
                    {sub.original_ingredient}
                    <span className="text-muted-foreground font-normal"> - {sub.reason}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sub.alternatives.map((alt, altIdx) => {
                      const isApplied = appliedSubstitutions.get(sub.original_ingredient) === alt.name;
                      return (
                        <Button
                          key={altIdx}
                          variant={isApplied ? "default" : "outline"}
                          size="sm"
                          onClick={() => applySubstitution(sub.original_ingredient, alt.name)}
                        >
                          {alt.quantity} {alt.unit} {alt.name}
                          {isApplied && " ✓"}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ingredienser</CardTitle>
            <p className="text-sm text-muted-foreground">
              Huk av ingredienser du allerede har
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipe.ingredients?.map((ingredient, index) => {
              const display = getDisplayIngredient(ingredient);
              return (
                <div key={index} className="flex items-center space-x-3">
                  <Checkbox
                    id={`ingredient-${index}`}
                    checked={selectedIngredients.has(display.name)}
                    onCheckedChange={() => toggleIngredient(display.name)}
                  />
                  <label
                    htmlFor={`ingredient-${index}`}
                    className={`text-sm font-medium leading-none cursor-pointer ${
                      display.isSubstituted ? "text-primary" : ""
                    }`}
                  >
                    {isDinnerRecipe ? scaleQuantity(ingredient.quantity) : ingredient.quantity} {ingredient.unit} {display.name}
                    {display.isSubstituted && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (erstatter {display.original})
                      </span>
                    )}
                  </label>
                </div>
              );
            })}
            <Button
              onClick={handleAddToList}
              className="w-full mt-4"
              disabled={selectedIngredients.size === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Legg til {selectedIngredients.size} ingredienser i handlelisten
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fremgangsmåte</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <p className="text-foreground pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
