import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import ShoppingLists from '@/components/ShoppingLists';
import Onboarding from '@/components/Onboarding';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      setProfileLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('user_id', user.id)
          .single();

        if (error || !profile || !profile.preferences) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setShowOnboarding(true);
      } finally {
        setProfileLoading(false);
      }
    };

    if (user && !loading) {
      checkProfile();
    }
  }, [user, loading]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-lg">Laster...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Ren Handel</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {user.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logg ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ShoppingLists />
      </main>
    </div>
  );
};

export default Index;
