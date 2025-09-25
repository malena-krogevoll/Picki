import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, Leaf, Wheat, Fish, Milk, Egg, TreePine, Nut } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
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

  const handleComplete = async () => {
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
        .upsert({
          user_id: user.id,
          preferences,
          display_name: user.email?.split('@')[0] || 'Bruker'
        });

      if (error) throw error;

      toast({
        title: "Velkommen!",
        description: "Preferansene dine er lagret. Du er nå klar til å bruke appen!"
      });

      onComplete();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Velkommen til Ren Handel!</CardTitle>
          <p className="text-muted-foreground">
            La oss tilpasse appen til dine behov
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

          <Button 
            onClick={handleComplete}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Lagrer...' : 'Fullfør oppsett'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;