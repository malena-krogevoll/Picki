import { User, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import pickiLogo from "@/assets/picki-logo-new.png";
import { useState } from "react";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
  };

  return (
    <header className="bg-primary text-primary-foreground py-3 px-4 md:py-4 md:px-6 shadow-lg safe-top">
      <div className="container mx-auto flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => navigate("/")}
        >
          <img src={pickiLogo} alt="Picki" className="h-8 md:h-12" />
        </div>
        
        {user && (
          <>
            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <User className="h-4 w-4 mr-2" />
                Profil
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logg ut
              </Button>
            </div>

            {/* Mobile hamburger menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10 touch-target"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-background">
                <SheetHeader>
                  <SheetTitle className="text-left">Meny</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate("/profile")}
                    className="justify-start h-14 text-base touch-target"
                  >
                    <User className="h-5 w-5 mr-3" />
                    Profil
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="justify-start h-14 text-base text-destructive hover:text-destructive touch-target"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logg ut
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
};
