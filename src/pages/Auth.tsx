import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import pickiLogo from '@/assets/picki-logo-auth.png';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Vennligst fyll ut alle feltene"
      });
      return;
    }

    setLoading(true);
    
    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } else {
      toast({
        title: "Suksess",
        description: isSignUp 
          ? "Konto opprettet! Sjekk e-posten din for bekreftelse."
          : "Logget inn!"
      });
      if (!isSignUp) {
        navigate('/');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={pickiLogo} alt="Picki" className="h-16" />
          </div>
          <p className="text-muted-foreground">Ærlig mat. Enkle valg. Mindre stress.</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logg inn</TabsTrigger>
              <TabsTrigger value="signup">Registrer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">E-post</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Passord</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ditt passord"
                />
              </div>
              <Button 
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Logger inn...' : 'Logg inn'}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">E-post</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Passord</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Velg et sterkt passord"
                />
              </div>
              <Button 
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Oppretter konto...' : 'Opprett konto'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;