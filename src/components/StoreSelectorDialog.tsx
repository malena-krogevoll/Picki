import { Store, ShoppingBag, ShoppingCart, Package, Beef, Tag, Building2, Building, Home, Warehouse } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LucideIcon } from "lucide-react";

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

interface StoreSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStore: (storeId: string) => void;
}

export const StoreSelectorDialog = ({ open, onOpenChange, onSelectStore }: StoreSelectorDialogProps) => {
  const handleSelectStore = (storeId: string) => {
    onSelectStore(storeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Velg butikk</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {stores.map((store) => {
            const IconComponent = store.icon;
            return (
              <button
                key={store.id}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-secondary/30 transition-all"
                onClick={() => handleSelectStore(store.id)}
              >
                <div className="bg-primary/10 p-3 rounded-xl">
                  <IconComponent className={`h-5 w-5 ${store.color}`} />
                </div>
                <span className="text-base font-semibold">{store.name}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const getStoreName = (storeId: string): string => {
  const store = stores.find(s => s.id === storeId);
  return store?.name || storeId;
};

export const getStoreIcon = (storeId: string): LucideIcon => {
  const store = stores.find(s => s.id === storeId);
  return store?.icon || Store;
};

export const getStoreColor = (storeId: string): string => {
  const store = stores.find(s => s.id === storeId);
  return store?.color || "text-muted-foreground";
};
