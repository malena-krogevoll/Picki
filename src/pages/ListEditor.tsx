import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ShoppingMode, clearSessionCache } from "@/components/ShoppingMode";
import { StoreSelectorDialog } from "@/components/StoreSelectorDialog";
import { ItemSuggestions } from "@/components/ItemSuggestions";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList, ProductData } from "@/hooks/useShoppingList";
import { useFrequentItems } from "@/hooks/useFrequentItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, X, Store, ShoppingCart, Minus, ClipboardPaste, Pencil, Check, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseShoppingListText, ParsedItem } from "@/lib/textParser";

type ViewMode = 'edit' | 'shop';

const ListEditor = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { lists, loading: listLoading, addItem, removeItem, updateListStore, updateListName, updateItemQuantity, setActiveList } = useShoppingList(user?.id);
  const navigate = useNavigate();
  const [newItemName, setNewItemName] = useState("");
  const [view, setView] = useState<ViewMode>('edit');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const currentList = lists.find(l => l.id === listId);
  const items = currentList?.items || [];
  const { suggestions: frequentItems } = useFrequentItems(user?.id, items.map(i => i.name));
  const visibleSuggestions = frequentItems.slice(0, 3);

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

  const handleAddItem = async (itemName?: string) => {
    const name = itemName || newItemName;
    if (!listId || !name.trim()) return;
    await addItem(listId, name.trim());
    setNewItemName("");
    setShowSuggestions(false);
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
    // Clear session cache for old store if we're changing stores
    if (currentList?.store_id && currentList.store_id !== storeId) {
      clearSessionCache(listId, currentList.store_id);
    }
    await updateListStore(listId, storeId);
    setShowStoreDialog(false);
    setView('shop');
    toast.success("Butikk valgt - finner produkter...");
  };

  const handleEditList = () => {
    setView('edit');
  };

  const handlePasteTextChange = (text: string) => {
    setPasteText(text);
    const items = parseShoppingListText(text);
    setParsedItems(items);
  };

  const handleAddPastedItems = async () => {
    if (!listId || parsedItems.length === 0) return;
    
    for (const item of parsedItems) {
      await addItem(listId, item.product_name, undefined, item.quantity, item.notes);
    }
    
    toast.success(`${parsedItems.length} varer lagt til`);
    setShowPasteDialog(false);
    setPasteText("");
    setParsedItems([]);
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
            key={`${listId}-${currentList.store_id}`}
            storeId={currentList.store_id}
            listId={listId!}
            onEditList={handleEditList}
            onChangeStore={handleSelectStore}
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

        {/* Editable list title */}
        <div className="flex items-center gap-2 mb-6">
          {isEditingName ? (
            <>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-xl font-bold h-10 rounded-2xl"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateListName(listId!, editedName);
                    setIsEditingName(false);
                  }
                  if (e.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={() => {
                  updateListName(listId!, editedName);
                  setIsEditingName(false);
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">{currentList.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditedName(currentList.name);
                  setIsEditingName(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Add new item input */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Input
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Legg til vare..."
              className="rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
            />
            <Button 
              onClick={() => handleAddItem()} 
              disabled={!newItemName.trim()}
              className="rounded-2xl"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowPasteDialog(true)}
              className="rounded-2xl"
              title="Lim inn ingrediensliste"
            >
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
          <ItemSuggestions 
            query={newItemName}
            onSelectSuggestion={(suggestion) => handleAddItem(suggestion)}
            visible={showSuggestions}
          />

          {/* Frequent item quick-add suggestions */}
          {visibleSuggestions.length > 0 && !newItemName.trim() && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5" />
              {visibleSuggestions.map((item) => (
                <Badge
                  key={item.name}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors text-xs py-1 px-3"
                  onClick={() => handleAddItem(item.name)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {item.name}
                </Badge>
              ))}
            </div>
          )}
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

        {/* Continue to shopping or store selection */}
        {items.length > 0 && (
          currentList.store_id ? (
            <Button
              onClick={() => setView('shop')}
              className="w-full h-14 text-base rounded-2xl"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Tilbake til handlemodus
              <ChevronRight className="h-5 w-5 ml-auto" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowStoreDialog(true)}
              className="w-full h-14 text-base rounded-2xl"
              size="lg"
            >
              <Store className="h-5 w-5 mr-2" />
              Velg butikk og finn produkter
              <ChevronRight className="h-5 w-5 ml-auto" />
            </Button>
          )
        )}

        {/* Store selector dialog */}
        <StoreSelectorDialog
          open={showStoreDialog}
          onOpenChange={setShowStoreDialog}
          onSelectStore={handleSelectStore}
          currentStoreId={currentList.store_id || undefined}
        />

        {/* Paste ingredients dialog */}
        <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Lim inn ingrediensliste</DialogTitle>
              <DialogDescription>
                Lim inn en liste med ingredienser fra en oppskrift. Hver linje eller kommaseparert vare blir en egen vare.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={pasteText}
                onChange={(e) => handlePasteTextChange(e.target.value)}
                placeholder="Eksempel:
2 dl melk
3 egg
1 pose gjær
500g hvetemel"
                rows={6}
                className="resize-none"
              />
              {parsedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {parsedItems.length} varer gjenkjent:
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {parsedItems.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {item.quantity > 1 && `${item.quantity}x `}
                        {item.product_name}
                        {item.notes && ` (${item.notes})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowPasteDialog(false);
                setPasteText("");
                setParsedItems([]);
              }}>
                Avbryt
              </Button>
              <Button 
                onClick={handleAddPastedItems}
                disabled={parsedItems.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Legg til {parsedItems.length} varer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ListEditor;
