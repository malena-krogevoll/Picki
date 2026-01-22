import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';
import pickiLogo from '@/assets/picki-logo-auth.png';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'Minst 6 tegn', test: (p) => p.length >= 6 },
  { label: 'Inneholder en stor bokstav', test: (p) => /[A-Z]/.test(p) },
  { label: 'Inneholder en liten bokstav', test: (p) => /[a-z]/.test(p) },
  { label: 'Inneholder et tall', test: (p) => /[0-9]/.test(p) },
];

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const passwordValidation = useMemo(() => {
    return passwordRequirements.map(req => ({
      ...req,
      met: req.test(password)
    }));
  }, [password]);

  const allRequirementsMet = passwordValidation.every(req => req.met);
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
            <img src={pickiLogo} alt="Picki" className="h-32" />
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
                {/* Password requirements */}
                {password.length > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Passordkrav:</p>
                    {passwordValidation.map((req, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {req.met ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className={`text-xs ${req.met ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => handleSubmit(true)}
                disabled={loading || !allRequirementsMet}
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