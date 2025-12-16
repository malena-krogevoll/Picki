import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Clock, Users, Plus } from "lucide-react";
import { Recipe } from "@/pages/DinnerExplorer";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { removeUnitsFromIngredient } from "@/utils/ingredientUtils";

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

export const RecipeDetail = ({ recipe, onBack }: RecipeDetailProps) => {
  const { user } = useAuth();
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    new Set(recipe.ingredients)
  );
  const { lists, addItem } = useShoppingList(user?.id);
  const { toast } = useToast();
  const totalTime = recipe.prepTime + recipe.cookTime;

  const toggleIngredient = (ingredient: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(ingredient)) {
      newSelected.delete(ingredient);
    } else {
      newSelected.add(ingredient);
    }
    setSelectedIngredients(newSelected);
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
    const ingredientsToAdd = Array.from(selectedIngredients);

    try {
      for (const ingredient of ingredientsToAdd) {
        // Remove units from ingredient name for better product search
        const cleanedIngredient = removeUnitsFromIngredient(ingredient);
        await addItem(activeList.id, cleanedIngredient);
      }

      toast({
        title: "Ingredienser lagt til",
        description: `${ingredientsToAdd.length} ingredienser er lagt til handlelisten`,
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
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbake til oppskrifter
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {recipe.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            {recipe.description}
          </p>
          <div className="flex gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Total tid: {totalTime} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{recipe.servings} porsjoner</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingredienser</CardTitle>
            <p className="text-sm text-muted-foreground">
              Huk av ingredienser du allerede har
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Checkbox
                  id={`ingredient-${index}`}
                  checked={selectedIngredients.has(ingredient)}
                  onCheckedChange={() => toggleIngredient(ingredient)}
                />
                <label
                  htmlFor={`ingredient-${index}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {ingredient}
                </label>
              </div>
            ))}
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
