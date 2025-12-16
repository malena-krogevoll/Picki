import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { Recipe } from "@/pages/DinnerExplorer";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => {
  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-xl">{recipe.title}</CardTitle>
        <CardDescription>{recipe.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{totalTime} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} porsjoner</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
            {recipe.category}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
