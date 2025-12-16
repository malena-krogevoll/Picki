import { User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import pickiLogo from "@/assets/picki-logo-new.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <img src={pickiLogo} alt="Picki" className="h-12" />
        </div>
        {user && (
          <div className="flex items-center gap-2">
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
        )}
      </div>
    </header>
  );
};
