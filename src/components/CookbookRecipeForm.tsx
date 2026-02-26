import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Upload, Loader2 } from "lucide-react";
import { CookbookRecipe, CookbookRecipeInput } from "@/hooks/useCookbook";
import { parseShoppingListText } from "@/lib/textParser";

interface CookbookRecipeFormProps {
  recipe?: CookbookRecipe;
  onSave: (input: CookbookRecipeInput) => Promise<string | null | boolean>;
  onCancel: () => void;
  saving?: boolean;
}

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
}

export const CookbookRecipeForm = ({ recipe, onSave, onCancel, saving }: CookbookRecipeFormProps) => {
  const [title, setTitle] = useState(recipe?.title || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [servings, setServings] = useState(recipe?.servings?.toString() || "");
  const [prepTime, setPrepTime] = useState(recipe?.prep_time?.toString() || "");
  const [cookTime, setCookTime] = useState(recipe?.cook_time?.toString() || "");
  const [steps, setSteps] = useState<string[]>(recipe?.steps?.length ? recipe.steps : [""]);
  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    recipe?.ingredients?.map(i => ({ name: i.name, quantity: i.quantity || "", unit: i.unit || "" })) || []
  );
  const [ingredientText, setIngredientText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(recipe?.image_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addIngredientsFromText = () => {
    if (!ingredientText.trim()) return;
    const parsed = parseShoppingListText(ingredientText);
    const newIngredients = parsed.map(p => ({
      name: p.product_name,
      quantity: p.quantity > 1 ? p.quantity.toString() : "",
      unit: "",
    }));
    setIngredients(prev => [...prev, ...newIngredients]);
    setIngredientText("");
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: "", quantity: "", unit: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientInput, value: string) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  };

  const addStep = () => setSteps(prev => [...prev, ""]);
  const removeStep = (index: number) => setSteps(prev => prev.filter((_, i) => i !== index));
  const updateStep = (index: number, value: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? value : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    let imageUrl = recipe?.image_url || undefined;

    // Upload image if new file selected
    if (imageFile) {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = imageFile.name.split(".").pop();
      const path = `cookbook/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(path, imageFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("recipe-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const input: CookbookRecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      servings: servings ? parseInt(servings) : undefined,
      prep_time: prepTime ? parseInt(prepTime) : undefined,
      cook_time: cookTime ? parseInt(cookTime) : undefined,
      steps: steps.filter(s => s.trim()),
      image_url: imageUrl,
      source_recipe_id: recipe?.source_recipe_id || undefined,
      ingredients: ingredients
        .filter(i => i.name.trim())
        .map((i, idx) => ({
          name: i.name.trim(),
          quantity: i.quantity || undefined,
          unit: i.unit || undefined,
          sort_order: idx,
        })),
    };

    await onSave(input);
    setIsSubmitting(false);
  };

  const isSaving = saving || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <Button type="button" variant="ghost" onClick={onCancel} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbake
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{recipe ? "Rediger oppskrift" : "Ny oppskrift"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Gi oppskriften et navn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kort beskrivelse (valgfritt)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="servings">Porsjoner</Label>
              <Input id="servings" type="number" min="1" value={servings} onChange={e => setServings(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep">Forberedelse (min)</Label>
              <Input id="prep" type="number" min="0" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cook">Tilberedning (min)</Label>
              <Input id="cook" type="number" min="0" value={cookTime} onChange={e => setCookTime(e.target.value)} />
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Bilde</Label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <img src={imagePreview} alt="Forhåndsvisning" className="w-20 h-20 rounded-lg object-cover" />
              )}
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{imagePreview ? "Bytt bilde" : "Last opp bilde"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredienser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paste text input */}
          <div className="space-y-2">
            <Label>Lim inn ingrediensliste</Label>
            <div className="flex gap-2">
              <Textarea
                value={ingredientText}
                onChange={e => setIngredientText(e.target.value)}
                placeholder="Lim inn ingredienser adskilt med komma eller linjeskift"
                rows={2}
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addIngredientsFromText} className="self-end">
                Legg til
              </Button>
            </div>
          </div>

          {/* Individual ingredients */}
          {ingredients.map((ing, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Mengde"
                value={ing.quantity}
                onChange={e => updateIngredient(index, "quantity", e.target.value)}
                className="w-20"
              />
              <Input
                placeholder="Enhet"
                value={ing.unit}
                onChange={e => updateIngredient(index, "unit", e.target.value)}
                className="w-20"
              />
              <Input
                placeholder="Ingrediens"
                value={ing.name}
                onChange={e => updateIngredient(index, "name", e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addIngredient} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Legg til ingrediens
          </Button>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Fremgangsmåte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm mt-1">
                {index + 1}
              </span>
              <Textarea
                value={step}
                onChange={e => updateStep(index, e.target.value)}
                placeholder={`Steg ${index + 1}`}
                rows={2}
                className="flex-1"
              />
              {steps.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)} className="mt-1">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addStep} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Legg til steg
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!title.trim() || isSaving} className="w-full h-12">
        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        {recipe ? "Lagre endringer" : "Opprett oppskrift"}
      </Button>
    </form>
  );
};
