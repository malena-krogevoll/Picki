import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProductSearchInput } from "@/components/ProductSearchInput";
import { ShoppingListItem } from "@/components/ShoppingListItem";
import { StoreSelectorDialog, getStoreName, getStoreIcon, getStoreColor } from "@/components/StoreSelectorDialog";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList, ProductData } from "@/hooks/useShoppingList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Store, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ListEditor = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { lists, loading: listLoading, addItem, removeItem, updateItemStatus, updateListStore, completeList, setActiveList } = useShoppingList(user?.id);
  const navigate = useNavigate();
  const [showStoreSelector, setShowStoreSelector] = useState(false);

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

  useEffect(() => {
    if (currentList) {
      setActiveList(currentList);
    }
  }, [currentList, setActiveList]);

  const handleAddProduct = async (name: string, productData?: ProductData) => {
    if (!listId) return;
    await addItem(listId, name, productData);
    toast.success(productData ? "Produkt lagt til" : "Vare lagt til");
  };

  const handleChangeStore = async (storeId: string) => {
    if (!listId) return;
    await updateListStore(listId, storeId);
    toast.success(`Byttet til ${getStoreName(storeId)}`);
  };

  const handleCompleteList = async () => {
    if (!listId) return;
    await completeList(listId);
    toast.success("Handleliste fullført!");
    navigate("/");
  };

  const allItemsInCart = items.length > 0 && items.every(item => item.in_cart);

  const totalPrice = items.reduce((sum, item) => {
    return sum + (item.product_data?.price || 0);
  }, 0);

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

  const StoreIcon = currentList.store_id ? getStoreIcon(currentList.store_id) : Store;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        {/* Header with back button and store selector */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="rounded-2xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowStoreSelector(true)}
            className="rounded-2xl"
          >
            <StoreIcon className={`h-4 w-4 mr-2 ${currentList.store_id ? getStoreColor(currentList.store_id) : ''}`} />
            {currentList.store_id ? getStoreName(currentList.store_id) : 'Velg butikk'}
          </Button>
        </div>

        {/* List title */}
        <h1 className="text-xl font-bold mb-6">{currentList.name}</h1>

        {/* Product search input */}
        {currentList.store_id && (
          <div className="mb-6">
            <ProductSearchInput
              storeId={currentList.store_id}
              onAddProduct={handleAddProduct}
            />
          </div>
        )}

        {!currentList.store_id && (
          <div className="text-center py-8 bg-secondary/30 rounded-2xl mb-6">
            <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Velg en butikk for å begynne å legge til varer</p>
            <Button className="mt-4 rounded-2xl" onClick={() => setShowStoreSelector(true)}>
              Velg butikk
            </Button>
          </div>
        )}

        {/* Shopping list items */}
        {items.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {items.length} {items.length === 1 ? 'vare' : 'varer'}
              </h2>
              {totalPrice > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  ca. {totalPrice.toFixed(0)} kr
                </Badge>
              )}
            </div>
            
            {items.map((item) => (
              <ShoppingListItem
                key={item.id}
                id={item.id}
                name={item.name}
                inCart={item.in_cart}
                productData={item.product_data}
                onToggleCart={() => updateItemStatus(item.id, !item.in_cart)}
                onRemove={() => removeItem(item.id)}
                listId={listId!}
                storeId={currentList.store_id || ''}
              />
            ))}
          </div>
        )}

        {/* Complete button */}
        {items.length > 0 && allItemsInCart && (
          <Button
            onClick={handleCompleteList}
            className="w-full h-14 text-base rounded-2xl"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Fullfør handling
          </Button>
        )}

        {/* Store selector dialog */}
        <StoreSelectorDialog
          open={showStoreSelector}
          onOpenChange={setShowStoreSelector}
          onSelectStore={handleChangeStore}
        />
      </main>
    </div>
  );
};

export default ListEditor;
