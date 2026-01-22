import { useState, useEffect } from "react";
import { ChefHat, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

// Common pantry items that users typically have at home
const COMMON_PANTRY_ITEMS = [
  "salt",
  "pepper",
  "svartpepper",
  "hvitpepper",
  "sukker",
  "olje",
  "olivenolje",
  "rapsolje",
  "vann",
  "mel",
  "hvetemel",
];

const isCommonPantryItem = (ingredientName: string): boolean => {
  const normalized = ingredientName.toLowerCase().trim();
  return COMMON_PANTRY_ITEMS.some(item => 
    normalized === item || 
    normalized.includes(item) ||
    item.includes(normalized)
  );
};

export const DiyAlternativeDialog = ({
  open,
  onOpenChange,
  recipe,
  originalItemName,
  onAddIngredients,
  onCancel,
}: DiyAlternativeDialogProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

  // Initialize selected ingredients when recipe changes
  useEffect(() => {
    if (recipe) {
      const initialSelected = new Set<string>();
      recipe.ingredients.forEach(ing => {
        // Uncheck common pantry items by default
        if (!isCommonPantryItem(ing.name)) {
          initialSelected.add(ing.id);
        }
      });
      setSelectedIngredients(initialSelected);
    }
  }, [recipe]);

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIngredients(new Set(recipe.ingredients.map(ing => ing.id)));
  };

  const deselectAll = () => {
    setSelectedIngredients(new Set());
  };

  const handleAddIngredients = async () => {
    setIsAdding(true);
    try {
      const ingredientsToAdd = recipe.ingredients.filter(ing => selectedIngredients.has(ing.id));
      await onAddIngredients(ingredientsToAdd);
      onOpenChange(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const selectedCount = selectedIngredients.size;
  const totalCount = recipe.ingredients.length;

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
              <span>{selectedCount} av {totalCount} ingredienser valgt</span>
            </div>
          </div>

          {/* Ingredients with checkboxes */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-2 max-h-[250px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Velg ingredienser:</p>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAll}
                  className="h-7 text-xs px-2"
                >
                  Velg alle
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={deselectAll}
                  className="h-7 text-xs px-2"
                >
                  Fjern alle
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {recipe.ingredients.map((ing) => {
                const isSelected = selectedIngredients.has(ing.id);
                const isPantryItem = isCommonPantryItem(ing.name);
                
                return (
                  <div 
                    key={ing.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-secondary'
                    }`}
                    onClick={() => toggleIngredient(ing.id)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleIngredient(ing.id)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {ing.quantity && `${ing.quantity} `}
                        {ing.unit && `${ing.unit} `}
                        <span className={`font-medium ${isSelected ? 'text-foreground' : ''}`}>{ing.name}</span>
                      </span>
                    </div>
                    {isPantryItem && (
                      <Badge variant="outline" className="text-xs rounded-full flex-shrink-0">
                        Basevare
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info about pantry items */}
          <p className="text-xs text-muted-foreground">
            💡 Basevarer som salt og pepper er ikke valgt som standard – de har du trolig hjemme.
          </p>

          {/* What happens */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Hva skjer:</strong> "{originalItemName}" blir erstattet med {selectedCount} {selectedCount === 1 ? 'ingrediens' : 'ingredienser'} i handlelisten din.
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
              disabled={isAdding || selectedCount === 0}
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
                  Legg til ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
