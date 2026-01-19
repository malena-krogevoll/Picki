import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { StoreSelector } from "@/components/StoreSelector";
import { ShoppingMode } from "@/components/ShoppingMode";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList, ProductData } from "@/hooks/useShoppingList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Store, ShoppingCart, Minus } from "lucide-react";
import { toast } from "sonner";

type ViewMode = 'edit' | 'select-store' | 'shop';

const ListEditor = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { lists, loading: listLoading, addItem, removeItem, updateListStore, updateItemQuantity, setActiveList } = useShoppingList(user?.id);
  const navigate = useNavigate();
  const [newItemName, setNewItemName] = useState("");
  const [view, setView] = useState<ViewMode>('edit');

  const currentList = lists.find(l => l.id === listId);
  const items = currentList?.items || [];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!listLoading && !currentList && listId) {
      navigate("/");
    }
  }, [currentList, listId, listLoading, navigate]);

  // Only set initial view based on store_id on first load
  const [initialViewSet, setInitialViewSet] = useState(false);
  
  useEffect(() => {
    if (currentList) {
      setActiveList(currentList);
      // Only auto-navigate to shop mode on initial load, not on every update
      if (!initialViewSet && currentList.store_id) {
        setView('shop');
        setInitialViewSet(true);
      } else if (!initialViewSet) {
        setInitialViewSet(true);
      }
    }
  }, [currentList, setActiveList, initialViewSet]);

  const handleAddItem = async () => {
    if (!listId || !newItemName.trim()) return;
    await addItem(listId, newItemName.trim());
    setNewItemName("");
    toast.success("Vare lagt til");
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId);
    toast.success("Vare fjernet");
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateItemQuantity(itemId, newQuantity);
  };

  const handleSelectStore = async (storeId: string) => {
    if (!listId) return;
    await updateListStore(listId, storeId);
    setView('shop');
    toast.success("Butikk valgt - finner produkter...");
  };

  const handleBackFromStore = () => {
    setView('edit');
  };

  const handleBackFromShop = () => {
    setView('select-store');
  };

  if (authLoading || listLoading || !currentList) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">Laster...</div>
        </main>
      </div>
    );
  }

  // Shopping mode - show product suggestions
  if (view === 'shop' && currentList.store_id) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
          <ShoppingMode
            storeId={currentList.store_id}
            listId={listId!}
            onBack={handleBackFromShop}
          />
        </main>
      </div>
    );
  }

  // Store selection mode
  if (view === 'select-store') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold mb-2">Velg butikk</h1>
            <p className="text-muted-foreground text-sm">
              Hvor skal du handle? Vi finner produkter og priser for deg.
            </p>
          </div>
          <StoreSelector
            onSelectStore={handleSelectStore}
            onBack={handleBackFromStore}
          />
        </main>
      </div>
    );
  }

  // Edit mode - manage free-text items
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="rounded-2xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
        </div>

        {/* List title */}
        <h1 className="text-xl font-bold mb-6">{currentList.name}</h1>

        {/* Add new item input */}
        <div className="flex gap-2 mb-6">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Legg til vare..."
            className="rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              }
            }}
          />
          <Button 
            onClick={handleAddItem} 
            disabled={!newItemName.trim()}
            className="rounded-2xl"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Items list */}
        {items.length > 0 ? (
          <div className="space-y-2 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {items.length} {items.length === 1 ? 'vare' : 'varer'}
              </h2>
            </div>
            
            {items.map((item) => (
              <Card key={item.id} className="border-2 border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-muted rounded-full p-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Item name and notes */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.notes && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.notes})
                      </span>
                    )}
                  </div>
                  
                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-border mb-8">
            <CardContent className="py-8 text-center">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Ingen varer ennå</p>
              <p className="text-xs text-muted-foreground mt-1">Bruk feltet over for å legge til varer</p>
            </CardContent>
          </Card>
        )}

        {/* Continue to store selection */}
        {items.length > 0 && (
          <Button
            onClick={() => setView('select-store')}
            className="w-full h-14 text-base rounded-2xl"
            size="lg"
          >
            <Store className="h-5 w-5 mr-2" />
            Velg butikk og finn produkter
          </Button>
        )}
      </main>
    </div>
  );
};

export default ListEditor;
