import React, { useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useCookbook, CookbookRecipe, CookbookRecipeInput } from "@/hooks/useCookbook";
import { CookbookRecipeForm } from "@/components/CookbookRecipeForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { BookOpen, Plus, Clock, Users, Pencil, Trash2, ArrowLeft, AlertCircle, ChefHat } from "lucide-react";
import { useNavigate } from "react-router-dom";

type View = "list" | "create" | "edit" | "detail";

const Cookbook = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recipes, loading, addRecipe, updateRecipe, deleteRecipe } = useCookbook(user?.id);
  const [view, setView] = useState<View>("list");
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {view === "list" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">Min kokebok</h1>
              </div>
              <Button onClick={() => { setSelectedRecipe(null); setView("create"); }}>
                <Plus className="h-4 w-4 mr-2" />
                Ny oppskrift
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : recipes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Kokeboken er tom</h3>
                  <p className="text-muted-foreground mb-4">
                    Opprett egne oppskrifter eller lagre oppskrifter fra exploreren.
                  </p>
                  <Button onClick={() => setView("create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Opprett din første oppskrift
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map(recipe => (
                  <Card
                    key={recipe.id}
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => openDetail(recipe)}
                  >
                    <div className="flex">
                      {recipe.image_url && (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-28 h-full object-cover flex-shrink-0"
                        />
                      )}
                      <CardContent className="p-4 flex-1 min-w-0">
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
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Rediger
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Slett
          </Button>
        </div>
      </div>

      {recipe.image_url && (
        <div className="rounded-xl overflow-hidden shadow-lg">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover" />
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.description && <p className="text-muted-foreground mt-2">{recipe.description}</p>}
        <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {recipe.servings} porsjoner
            </span>
          )}
        </div>
      </div>

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-lg mb-3">Ingredienser</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  {ing.quantity && <span className="font-medium">{ing.quantity}</span>}
                  {ing.unit && <span>{ing.unit}</span>}
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
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
    </div>
  );
};

export default Cookbook;
