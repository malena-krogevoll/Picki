import { useState, useEffect, forwardRef } from "react";
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
  { value: "vegetarian", label: "Vegetarianer" },
  { value: "pescatarian", label: "Peskitarianer" },
  { value: "low_fodmap", label: "LavFODMAP" },
  { value: "paleo", label: "Paleo" },
  { value: "anti_inflammatory", label: "Antiinflammatorisk" },
];

interface SortablePreferenceItemProps {
  id: string;
  label: string;
  index: number;
}

const SortablePreferenceItem = forwardRef<HTMLDivElement, SortablePreferenceItemProps>(
  ({ id, label, index }, _ref) => {
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
        className="flex items-center gap-3 p-4 rounded-md bg-background border border-border hover:border-primary/50 transition-colors cursor-move min-h-[48px]"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium text-base">{index}. {label}</span>
      </div>
    );
  }
);
SortablePreferenceItem.displayName = "SortablePreferenceItem";

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
  const [localFood, setLocalFood] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState<number>(2);
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
      setLocalFood(profile.preferences.other_preferences?.local_food || false);
      setHouseholdSize(profile.preferences.household_size || 2);

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
      // Work with the currently displayed list, not priorityOrder directly
      const currentList = getActivePreferences().map(p => p.id);
      const oldIndex = currentList.indexOf(active.id as string);
      const newIndex = currentList.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setPriorityOrder(arrayMove(currentList, oldIndex, newIndex));
      }
    }
  };

  const getActivePreferences = () => {
    const prefs: Array<{ id: string; label: string }> = [];

    if (allergies.length > 0) prefs.push({ id: "allergies", label: "Allergier" });
    if (diets.length > 0) prefs.push({ id: "diets", label: "Dietter" });
    if (organic) prefs.push({ id: "organic", label: "Økologisk mat" });
    if (lowestPrice) prefs.push({ id: "price", label: "Lavest pris" });
    if (animalWelfare) prefs.push({ id: "animal_welfare", label: "Dyrevelferd" });
    if (localFood) prefs.push({ id: "local_food", label: "Lokalmat" });

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
      if (p === "local_food") return localFood;
      return false;
    })];

    await updateProfile({
      allergies,
      diets,
      other_preferences: {
        organic,
        lowest_price: lowestPrice,
        animal_welfare: animalWelfare,
        local_food: localFood
      },
      priority_order: finalPriorityOrder,
      household_size: householdSize,
    });
    setSaving(false);
  };

  if (authLoading || profileLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 h-11 min-w-[44px]"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Tilbake
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Min profil</CardTitle>
            <CardDescription>
              Sett opp dine preferanser for å få best mulige produktanbefalinger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 md:space-y-8">
            <div className="space-y-3">
              <Label className="text-base">Allergier</Label>
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Legg til allergi"
                  onKeyPress={(e) => e.key === "Enter" && handleAddAllergy()}
                  className="h-12 text-base"
                />
                <Button onClick={handleAddAllergy} className="h-12 px-5 text-base">Legg til</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {allergies.map((allergy) => (
                  <Badge key={allergy} variant="secondary" className="text-sm py-1.5 px-3">
                    {allergy}
                    <button
                      onClick={() => handleRemoveAllergy(allergy)}
                      className="ml-2 p-1 -mr-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Dietter</Label>
              <div className="space-y-1">
                {AVAILABLE_DIETS.map((diet) => (
                  <div key={diet.value} className="flex items-center space-x-3 min-h-[44px]">
                    <Checkbox
                      id={diet.value}
                      checked={diets.includes(diet.value)}
                      onCheckedChange={() => handleToggleDiet(diet.value)}
                      className="h-5 w-5"
                    />
                    <Label htmlFor={diet.value} className="cursor-pointer text-base flex-1">
                      {diet.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Husstandsstørrelse</Label>
              <p className="text-sm text-muted-foreground">
                Standard antall porsjoner for middagsoppskrifter
              </p>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11"
                  onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                  disabled={householdSize <= 1}
                >
                  -
                </Button>
                <span className="text-2xl font-semibold w-12 text-center">{householdSize}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11"
                  onClick={() => setHouseholdSize(Math.min(12, householdSize + 1))}
                  disabled={householdSize >= 12}
                >
                  +
                </Button>
                <span className="text-muted-foreground">personer</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Andre preferanser</Label>
              <div className="space-y-1">
                <div className="flex items-center space-x-3 min-h-[44px]">
                  <Checkbox
                    id="organic"
                    checked={organic}
                    onCheckedChange={(checked) => setOrganic(checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="organic" className="cursor-pointer text-base flex-1">
                    Økologisk mat
                  </Label>
                </div>
                <div className="flex items-center space-x-3 min-h-[44px]">
                  <Checkbox
                    id="lowest_price"
                    checked={lowestPrice}
                    onCheckedChange={(checked) => setLowestPrice(checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="lowest_price" className="cursor-pointer text-base flex-1">
                    Lavest pris
                  </Label>
                </div>
                <div className="flex items-center space-x-3 min-h-[44px]">
                  <Checkbox
                    id="animal_welfare"
                    checked={animalWelfare}
                    onCheckedChange={(checked) => setAnimalWelfare(checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="animal_welfare" className="cursor-pointer text-base flex-1">
                    Dyrevelferd
                  </Label>
                </div>
                <div className="flex items-center space-x-3 min-h-[44px]">
                  <Checkbox
                    id="local_food"
                    checked={localFood}
                    onCheckedChange={(checked) => setLocalFood(checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="local_food" className="cursor-pointer text-base flex-1">
                    Lokalmat
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

            <Button onClick={handleSave} className="w-full h-12 text-base" disabled={saving}>
              {saving ? "Lagrer..." : "Lagre preferanser"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
