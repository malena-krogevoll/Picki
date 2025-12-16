import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, Leaf, Wheat, Fish, Milk, Egg, TreePine, Nut, ArrowLeft } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [renvareOnly, setRenvareOnly] = useState(false);

  const allergies = [
    { id: 'gluten', label: 'Gluten', icon: Wheat },
    { id: 'lactose', label: 'Laktose', icon: Milk },
    { id: 'nuts', label: 'Nøtter', icon: Nut },
    { id: 'fish', label: 'Fisk/Skalldyr', icon: Fish },
    { id: 'eggs', label: 'Egg', icon: Egg },
    { id: 'soy', label: 'Soya', icon: TreePine }
  ];

  const diets = [
    { id: 'vegetarian', label: 'Vegetarianer', icon: Leaf },
    { id: 'vegan', label: 'Veganer', icon: Heart },
    { id: 'keto', label: 'Keto', icon: Leaf },
    { id: 'low_carb', label: 'Lavkarbo', icon: Wheat }
  ];

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.preferences && typeof profile.preferences === 'object') {
          const prefs = profile.preferences as Record<string, unknown>;
          setSelectedAllergies((prefs.allergies as string[]) || []);
          setSelectedDiets((prefs.diets as string[]) || []);
          setRenvareOnly((prefs.renvare_only as boolean) || false);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const handleAllergyChange = (allergyId: string, checked: boolean) => {
    if (checked) {
      setSelectedAllergies(prev => [...prev, allergyId]);
    } else {
      setSelectedAllergies(prev => prev.filter(id => id !== allergyId));
    }
  };

  const handleDietChange = (dietId: string, checked: boolean) => {
    if (checked) {
      setSelectedDiets(prev => [...prev, dietId]);
    } else {
      setSelectedDiets(prev => prev.filter(id => id !== dietId));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const preferences = {
        allergies: selectedAllergies,
        diets: selectedDiets,
        renvare_only: renvareOnly,
        priority_order: ["renvare", "økologisk", "lavest_pris", "dyrevelfred"]
      };

      const { error } = await supabase
        .from('profiles')
        .update({ preferences })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Lagret!",
        description: "Preferansene dine er oppdatert."
      });

      onBack();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke lagre preferansene dine. Prøv igjen."
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg">Laster preferanser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Innstillinger</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Endre dine preferanser og allergier
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Allergier */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Allergier & Intoleranser</h3>
            <p className="text-sm text-muted-foreground">
              Velg ingredienser du vil unngå
            </p>
            <div className="grid grid-cols-2 gap-3">
              {allergies.map((allergy) => {
                const Icon = allergy.icon;
                return (
                  <div key={allergy.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50">
                    <Checkbox
                      id={allergy.id}
                      checked={selectedAllergies.includes(allergy.id)}
                      onCheckedChange={(checked) => handleAllergyChange(allergy.id, checked as boolean)}
                    />
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <Label 
                      htmlFor={allergy.id} 
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {allergy.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diett */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Kosthold</h3>
            <p className="text-sm text-muted-foreground">
              Velg ditt kosthold
            </p>
            <div className="grid grid-cols-2 gap-3">
              {diets.map((diet) => {
                const Icon = diet.icon;
                return (
                  <div key={diet.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50">
                    <Checkbox
                      id={diet.id}
                      checked={selectedDiets.includes(diet.id)}
                      onCheckedChange={(checked) => handleDietChange(diet.id, checked as boolean)}
                    />
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <Label 
                      htmlFor={diet.id} 
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {diet.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Renvare */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Renvare-preferanse</h3>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="renvare-only" className="text-sm font-medium">
                  Kun renvare produkter
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vis bare produkter uten unødvendige tilsetningsstoffer
                </p>
              </div>
              <Switch
                id="renvare-only"
                checked={renvareOnly}
                onCheckedChange={setRenvareOnly}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Lagrer...' : 'Lagre endringer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
