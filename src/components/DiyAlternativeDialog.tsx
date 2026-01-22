import { useState } from "react";
import { ChefHat, Clock, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DiyRecipe } from "@/hooks/useDiyAlternatives";

interface DiyAlternativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: DiyRecipe;
  originalItemName: string;
  onAddIngredients: (ingredients: { name: string; quantity: string | null; unit: string | null }[]) => void;
  onCancel: () => void;
}

export const DiyAlternativeDialog = ({
  open,
  onOpenChange,
  recipe,
  originalItemName,
  onAddIngredients,
  onCancel,
}: DiyAlternativeDialogProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  const handleAddIngredients = async () => {
    setIsAdding(true);
    try {
      await onAddIngredients(recipe.ingredients);
      onOpenChange(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="secondary" className="rounded-full">
              Hjemmelaget alternativ
            </Badge>
          </div>
          <DialogTitle className="text-xl">{recipe.title}</DialogTitle>
          <DialogDescription className="text-base">
            Vil du lage <strong>{recipe.title.toLowerCase()}</strong> selv i stedet for å kjøpe {originalItemName.toLowerCase()}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Recipe info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{totalTime} min</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span>{recipe.ingredients.length} ingredienser</span>
            </div>
          </div>

          {/* Ingredients preview */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-2 max-h-[200px] overflow-y-auto">
            <p className="text-sm font-medium text-foreground mb-2">Ingredienser du trenger:</p>
            <div className="space-y-1.5">
              {recipe.ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {ing.quantity && `${ing.quantity} `}
                    {ing.unit && `${ing.unit} `}
                    <span className="text-foreground font-medium">{ing.name}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* What happens */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Hva skjer:</strong> "{originalItemName}" blir erstattet med ingrediensene over i handlelisten din.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12 rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              Behold original
            </Button>
            <Button
              onClick={handleAddIngredients}
              disabled={isAdding}
              className="flex-1 h-12 rounded-xl"
            >
              {isAdding ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Legger til...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Lag selv
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
