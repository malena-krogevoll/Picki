import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, AlertTriangle, Leaf, ChefHat, Zap, Gauge } from "lucide-react";
import { Recipe } from "@/hooks/useRecipes";

interface RecipeCardEnhancedProps {
  recipe: Recipe & { 
    _allergenWarnings?: string[]; 
    _dietMatches?: string[];
    _hasWarnings?: boolean;
  };
  onClick: () => void;
}

type Difficulty = "lett" | "middels" | "vanskelig";

const getDifficulty = (recipe: Recipe): Difficulty => {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const stepsCount = recipe.steps?.length || 0;
  
  // Calculate difficulty based on time and steps
  if (totalTime <= 30 && stepsCount <= 5) {
    return "lett";
  } else if (totalTime > 60 || stepsCount > 10) {
    return "vanskelig";
  }
  return "middels";
};

const difficultyConfig: Record<Difficulty, { label: string; color: string; bars: number }> = {
  lett: { label: "Lett", color: "text-green-600", bars: 1 },
  middels: { label: "Middels", color: "text-amber-600", bars: 2 },
  vanskelig: { label: "Vanskelig", color: "text-red-600", bars: 3 },
};

const DifficultyIndicator = ({ difficulty }: { difficulty: Difficulty }) => {
  const config = difficultyConfig[difficulty];
  
  return (
    <div className={`flex items-center gap-1 ${config.color}`}>
      <div className="flex items-end gap-0.5 h-4">
        <div className={`w-1 rounded-sm ${config.bars >= 1 ? "bg-current h-2" : "bg-muted h-2"}`} />
        <div className={`w-1 rounded-sm ${config.bars >= 2 ? "bg-current h-3" : "bg-muted h-3"}`} />
        <div className={`w-1 rounded-sm ${config.bars >= 3 ? "bg-current h-4" : "bg-muted h-4"}`} />
      </div>
      <span className="text-xs">{config.label}</span>
    </div>
  );
};

export const RecipeCardEnhanced = ({ recipe, onClick }: RecipeCardEnhancedProps) => {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const isQuickRecipe = totalTime > 0 && totalTime < 30;
  const hasWarnings = recipe._hasWarnings || false;
  const difficulty = getDifficulty(recipe);

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
        hasWarnings ? "border-destructive/50 bg-destructive/5" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {recipe.recipe_type === "diy" && (
                <ChefHat className="h-5 w-5 text-primary" />
              )}
              {recipe.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {recipe.description}
            </CardDescription>
          </div>
          {hasWarnings && (
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <DifficultyIndicator difficulty={difficulty} />
          {isQuickRecipe && (
            <div className="flex items-center gap-1 text-amber-600">
              <Zap className="w-4 h-4" />
              <span>Rask</span>
            </div>
          )}
          {totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} porsjoner</span>
            </div>
          )}
        </div>

        {recipe.replaces && (
          <p className="text-xs text-muted-foreground">
            Erstatter: {recipe.replaces}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {recipe.category}
          </Badge>
          
          {recipe.diet_tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs gap-1 bg-green-50 border-green-200 text-green-700"
            >
              <Leaf className="h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>

        {hasWarnings && recipe._allergenWarnings && recipe._allergenWarnings.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            <span>Inneholder: {recipe._allergenWarnings.join(", ")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
