import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordValidation = useMemo(() => {
    return passwordRequirements.map(req => ({
      ...req,
      met: req.test(password)
    }));
  }, [password]);

  const allRequirementsMet = passwordValidation.every(req => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "E-post påkrevd",
        description: "Vennligst skriv inn e-postadressen din"
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://picki.lovable.app/auth?reset=true',
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: error.message
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: "E-post sendt!",
        description: "Sjekk innboksen din for en lenke til å tilbakestille passordet."
      });
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
          {showForgotPassword ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 -ml-2"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til innlogging
              </Button>
              
              {resetEmailSent ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">E-post sendt!</h3>
                  <p className="text-muted-foreground text-sm">
                    Vi har sendt en e-post til <strong>{email}</strong> med instruksjoner for å tilbakestille passordet ditt.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Sjekk også spam-mappen hvis du ikke finner e-posten.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-lg mb-2">Glemt passord?</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-post</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="din@epost.no"
                    />
                  </div>
                  <Button 
                    onClick={handleForgotPassword}
                    disabled={loading || !email}
                    className="w-full mt-4"
                  >
                    {loading ? 'Sender...' : 'Send tilbakestillingslenke'}
                  </Button>
                </>
              )}
            </div>
          ) : (
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
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Glemt passord?
                </button>
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
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Bekreft passord</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Skriv passordet på nytt"
                  />
                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      {passwordsMatch ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className={`text-xs ${passwordsMatch ? 'text-foreground' : 'text-destructive'}`}>
                        {passwordsMatch ? 'Passordene er like' : 'Passordene er ikke like'}
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => handleSubmit(true)}
                  disabled={loading || !allRequirementsMet || !passwordsMatch}
                  className="w-full"
                >
                  {loading ? 'Oppretter konto...' : 'Opprett konto'}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;