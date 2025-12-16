import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const AVAILABLE_DIETS = [
  { value: "vegan", label: "Veganer" },
  { value: "low_fodmap", label: "LavFODMAP" },
  { value: "paleo", label: "Paleo" },
  { value: "anti_inflammatory", label: "Antiinflammatorisk" },
];

interface SortablePreferenceItemProps {
  id: string;
  label: string;
  index: number;
}

const SortablePreferenceItem = ({ id, label, index }: SortablePreferenceItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-md bg-background border border-border hover:border-primary/50 transition-colors cursor-move"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{index}. {label}</span>
    </div>
  );
};

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);
  const navigate = useNavigate();

  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [diets, setDiets] = useState<string[]>([]);
  const [organic, setOrganic] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);
  const [animalWelfare, setAnimalWelfare] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setAllergies(profile.preferences.allergies || []);
      setDiets(profile.preferences.diets || []);
      setOrganic(profile.preferences.other_preferences?.organic || false);
      setLowestPrice(profile.preferences.other_preferences?.lowest_price || false);
      setAnimalWelfare(profile.preferences.other_preferences?.animal_welfare || false);

      const savedOrder = profile.preferences.priority_order || [];
      const orderWithoutCleanFood = savedOrder.filter(item => item !== "clean_food");
      setPriorityOrder(orderWithoutCleanFood);
    }
  }, [profile]);

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const handleToggleDiet = (diet: string) => {
    setDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPriorityOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getActivePreferences = () => {
    const prefs: Array<{ id: string; label: string }> = [];

    if (allergies.length > 0) prefs.push({ id: "allergies", label: "Allergier" });
    if (diets.length > 0) prefs.push({ id: "diets", label: "Dietter" });
    if (organic) prefs.push({ id: "organic", label: "Økologisk mat" });
    if (lowestPrice) prefs.push({ id: "price", label: "Lavest pris" });
    if (animalWelfare) prefs.push({ id: "animal_welfare", label: "Dyrevelferd" });

    // Sort according to priorityOrder
    const sortedPrefs = [...prefs].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.id);
      const bIndex = priorityOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return sortedPrefs;
  };

  const handleSave = async () => {
    setSaving(true);

    // Build priority order: clean_food always first, then user's order
    const finalPriorityOrder = ["clean_food", ...priorityOrder.filter(p => {
      if (p === "allergies") return allergies.length > 0;
      if (p === "diets") return diets.length > 0;
      if (p === "organic") return organic;
      if (p === "price") return lowestPrice;
      if (p === "animal_welfare") return animalWelfare;
      return false;
    })];

    await updateProfile({
      allergies,
      diets,
      other_preferences: {
        organic,
        lowest_price: lowestPrice,
        animal_welfare: animalWelfare
      },
      priority_order: finalPriorityOrder,
    });
    setSaving(false);
  };

  if (authLoading || profileLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Min profil</CardTitle>
            <CardDescription>
              Sett opp dine preferanser for å få best mulige produktanbefalinger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Allergier</Label>
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Legg til allergi"
                  onKeyPress={(e) => e.key === "Enter" && handleAddAllergy()}
                />
                <Button onClick={handleAddAllergy}>Legg til</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {allergies.map((allergy) => (
                  <Badge key={allergy} variant="secondary">
                    {allergy}
                    <button
                      onClick={() => handleRemoveAllergy(allergy)}
                      className="ml-2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietter</Label>
              <div className="space-y-2">
                {AVAILABLE_DIETS.map((diet) => (
                  <div key={diet.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={diet.value}
                      checked={diets.includes(diet.value)}
                      onCheckedChange={() => handleToggleDiet(diet.value)}
                    />
                    <Label htmlFor={diet.value} className="cursor-pointer">
                      {diet.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Andre preferanser</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="organic"
                    checked={organic}
                    onCheckedChange={(checked) => setOrganic(checked as boolean)}
                  />
                  <Label htmlFor="organic" className="cursor-pointer">
                    Økologisk mat
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lowest_price"
                    checked={lowestPrice}
                    onCheckedChange={(checked) => setLowestPrice(checked as boolean)}
                  />
                  <Label htmlFor="lowest_price" className="cursor-pointer">
                    Lavest pris
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="animal_welfare"
                    checked={animalWelfare}
                    onCheckedChange={(checked) => setAnimalWelfare(checked as boolean)}
                  />
                  <Label htmlFor="animal_welfare" className="cursor-pointer">
                    Dyrevelferd
                  </Label>
                </div>
              </div>
            </div>

            {getActivePreferences().length > 0 && (
              <div className="space-y-2">
                <Label>Prioriter preferanser</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Dra og slipp for å endre rekkefølge. Renvarer står alltid øverst.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                    <div className="text-muted-foreground">
                      <span className="text-lg">🔒</span>
                    </div>
                    <span className="font-medium">1. Renvarer (alltid først)</span>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={getActivePreferences().map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {getActivePreferences().map((pref, index) => (
                        <SortablePreferenceItem
                          key={pref.id}
                          id={pref.id}
                          label={pref.label}
                          index={index + 2}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? "Lagrer..." : "Lagre preferanser"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
