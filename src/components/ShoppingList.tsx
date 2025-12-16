import { useState, useEffect } from "react";
import { Plus, X, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useAuth } from "@/hooks/useAuth";

interface ShoppingListProps {
  listId: string;
  onContinue: () => void;
}

export const ShoppingList = ({ listId, onContinue }: ShoppingListProps) => {
  const { user } = useAuth();
  const { lists, addItem, removeItem } = useShoppingList(user?.id);
  const [newItem, setNewItem] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [recipeText, setRecipeText] = useState("");
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [isProcessingRecipe, setIsProcessingRecipe] = useState(false);

  const currentList = lists.find(l => l.id === listId);
  const items = currentList?.items || [];

  useEffect(() => {
    if (newItem.trim().length >= 2) {
      getSuggestions(newItem);
    } else {
      setSuggestions([]);
    }
  }, [newItem]);

  const getSuggestions = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-items', {
        body: { query }
      });

      if (error) throw error;

      setSuggestions(data?.suggestions || []);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddItem = async (itemName?: string) => {
    const name = itemName || newItem.trim();
    if (name) {
      await addItem(listId, name);
      setNewItem("");
      setSuggestions([]);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId);
  };

  const handleRecipeSubmit = async () => {
    if (!recipeText.trim()) {
      toast.error("Lim inn en oppskrift først");
      return;
    }

    setIsProcessingRecipe(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-recipe', {
        body: { recipeText: recipeText.trim() }
      });

      if (error) throw error;

      const ingredients = data?.ingredients || [];
      if (ingredients.length === 0) {
        toast.error("Fant ingen ingredienser i oppskriften");
        return;
      }

      // Add all ingredients to the list
      for (const ingredient of ingredients) {
        await addItem(listId, ingredient);
      }

      toast.success(`Lagt til ${ingredients.length} ingredienser fra oppskriften`);
      setRecipeText("");
      setIsRecipeDialogOpen(false);
    } catch (error) {
      console.error('Error parsing recipe:', error);
      toast.error("Kunne ikke behandle oppskriften");
    } finally {
      setIsProcessingRecipe(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Legg til vare..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              className="h-12 text-base rounded-2xl border-2 border-border focus:border-primary"
            />
          </div>
          <Button onClick={() => handleAddItem()} size="lg" className="h-12 px-6 rounded-2xl">
            <Plus className="h-5 w-5" />
          </Button>
          <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="h-12 px-6 rounded-2xl">
                <FileText className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Lim inn oppskrift</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Lim inn hele oppskriften her..."
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  className="min-h-[300px] text-base"
                />
                <Button
                  onClick={handleRecipeSubmit}
                  disabled={isProcessingRecipe}
                  className="w-full"
                >
                  {isProcessingRecipe ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Behandler oppskrift...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Legg til ingredienser
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {suggestions.length > 0 && (
          <div className="bg-secondary rounded-2xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">AI-forslag:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground rounded-full px-3 py-1 border border-border"
                  onClick={() => handleAddItem(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-card border-2 border-border rounded-2xl p-4 hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">{item.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(item.id)}
                className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <Button onClick={onContinue} className="w-full h-14 text-base rounded-2xl" size="lg">
          Velg butikk ({items.length} {items.length === 1 ? 'vare' : 'varer'})
        </Button>
      )}
    </div>
  );
};
