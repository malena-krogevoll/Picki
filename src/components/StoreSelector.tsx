import { Store, ShoppingBag, ShoppingCart, Package, Beef, Tag, Building2, Building, Home, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

// Store codes that actually have product data in Kassalapp API
const stores: { id: string; name: string; icon: LucideIcon; color: string }[] = [
  { id: "REMA_1000", name: "REMA 1000", icon: ShoppingBag, color: "text-blue-600" },
  { id: "KIWI", name: "KIWI", icon: ShoppingCart, color: "text-green-600" },
  { id: "MENY_NO", name: "MENY", icon: Beef, color: "text-red-600" },
  { id: "SPAR_NO", name: "SPAR", icon: Tag, color: "text-orange-600" },
  { id: "JOKER_NO", name: "Joker", icon: Store, color: "text-purple-600" },
  { id: "BUNNPRIS", name: "Bunnpris", icon: Package, color: "text-yellow-600" },
  { id: "COOP_MEGA", name: "Coop Mega", icon: Building2, color: "text-emerald-600" },
  { id: "COOP_EXTRA", name: "Coop Extra", icon: Building, color: "text-emerald-500" },
  { id: "COOP_PRIX", name: "Coop Prix", icon: Home, color: "text-emerald-700" },
  { id: "COOP_OBS", name: "Coop Obs", icon: Warehouse, color: "text-emerald-800" },
];

interface StoreSelectorProps {
  onSelectStore: (storeId: string) => void;
  onBack: () => void;
}

export const StoreSelector = ({ onSelectStore, onBack }: StoreSelectorProps) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="outline" onClick={onBack} className="rounded-2xl h-12">
        ← Tilbake til handleliste
      </Button>

      <div className="space-y-3">
        {stores.map((store) => {
          const IconComponent = store.icon;
          return (
            <div
              key={store.id}
              className="bg-card border-2 border-border rounded-2xl p-5 hover:border-primary hover:shadow-md transition-all cursor-pointer"
              onClick={() => onSelectStore(store.id)}
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <IconComponent className={`h-6 w-6 ${store.color}`} />
                </div>
                <span className="text-lg font-semibold">{store.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
