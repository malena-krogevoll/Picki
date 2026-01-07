import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  preferences: {
    allergies: string[];
    diets: string[];
    other_preferences: {
      organic: boolean;
      lowest_price: boolean;
      animal_welfare?: boolean;
    };
    priority_order: string[];
    household_size?: number;
  };
}

export const useProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      toast({
        title: "Feil ved henting av profil",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfile(data as unknown as UserProfile);
    }
    setLoading(false);
  };

  const updateProfile = async (preferences: UserProfile["preferences"]) => {
    if (!userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({ preferences })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Feil ved oppdatering av profil",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Profil oppdatert!",
      description: "Dine preferanser er lagret.",
    });

    await fetchProfile();
    return { error: null };
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
};
