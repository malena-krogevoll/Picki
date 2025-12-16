import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, AlertCircle, Sparkles, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProductSuggestion {
  ean: string;
  brand: string;
  name: string;
  image: string;
  price: number | null;
  store: string;
  novaScore: number;
}

interface ShoppingModeProps {
  storeId: string;
  listId: string;
  onBack: () => void;
}

const getNovaColor = (score: number) => {
  if (score <= 2) return "bg-primary text-primary-foreground";
  if (score === 3) return "bg-yellow-500 text-white";
  return "bg-destructive text-destructive-foreground";
};

const getNovaLabel = (score: number) => {
  if (score <= 2) return "Ren vare";
  if (score === 3) return "Moderat bearbeidet";
  return "Sterkt bearbeidet";
};

export const ShoppingMode = ({ storeId, listId, onBack }: ShoppingModeProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lists, updateItemStatus, completeList } = useShoppingList(user?.id);
  const { profile } = useProfile(user?.id);
  const [productData, setProductData] = useState<Record<string, ProductSuggestion[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});

  const currentList = lists.find(l => l.id === listId);
  const items = currentList?.items || [];

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);

      try {
        // Fetch all products in parallel with timeout
        const productPromises = items.map(async (item) => {
          try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 8000);
            });

            // Race between the actual fetch and timeout
            const fetchPromise = supabase.functions.invoke('search-products', {
              body: {
                query: item.name,
                storeId,
                userPreferences: profile?.preferences
              }
            });

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) {
              console.error('Error fetching products for', item.name, error);
              return { itemId: item.id, products: [] };
            } else if (data?.products && data.products.length > 0) {
              return { itemId: item.id, products: data.products };
            } else {
              return { itemId: item.id, products: [] };
            }
          } catch (err) {
            console.error('Error fetching products for', item.name, err);
            toast.error(`Kunne ikke hente produkter for "${item.name}"`);
            return { itemId: item.id, products: [] };
          }
        });

        const allResults = await Promise.all(productPromises);

        if (!isMounted) return;

        const results: Record<string, ProductSuggestion[]> = {};
        allResults.forEach(({ itemId, products }) => {
          results[itemId] = products;
        });

        setProductData(results);
      } catch (error) {
        console.error('Error in fetchProducts:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (items.length > 0) {
      fetchProducts();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [items, storeId, profile]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleToggleCart = async (itemId: string, currentStatus: boolean) => {
    await updateItemStatus(itemId, !currentStatus);
  };

  const handleSelectProduct = (itemId: string, productIndex: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [itemId]: productIndex
    }));
    toast.success("Produkt byttet");
  };

  const handleCompleteList = async () => {
    await completeList(listId);
    toast.success("Handleliste fullført!", {
      description: "Listen er nå arkivert."
    });
    onBack();
  };

  const allItemsInCart = items.length > 0 && items.every(item => item.in_cart);

  // Calculate total price
  const totalPrice = items.reduce((sum, item) => {
    const suggestions = productData[item.id] || [];
    const selectedIndex = selectedProducts[item.id] ?? 0;
    const selectedProduct = suggestions[selectedIndex];
    return sum + (selectedProduct?.price || 0);
  }, 0);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack} className="rounded-2xl h-12">
            ← Tilbake
          </Button>
          <Badge variant="outline" className="text-base px-4 py-2 rounded-full">
            {storeId.toUpperCase()}
          </Badge>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-card border-2 border-border rounded-2xl p-5">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="rounded-2xl h-12">
          ← Tilbake
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base px-4 py-2 rounded-full">
            {storeId.toUpperCase()}
          </Badge>
          {allItemsInCart && (
            <Button onClick={handleCompleteList} className="bg-primary hover:bg-primary/90 rounded-2xl h-12">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Fullfør
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => {
          const suggestions = productData[item.id] || [];
          const selectedIndex = selectedProducts[item.id] ?? 0;
          const selectedProduct = suggestions[selectedIndex];
          const alternatives = suggestions.filter((_, idx) => idx !== selectedIndex);
          const isExpanded = expandedItems.has(item.id);

          return (
            <div key={item.id} className={`bg-card border-2 rounded-2xl overflow-hidden transition-all ${item.in_cart ? "border-primary/50 bg-primary/5" : "border-border"}`}>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.in_cart}
                    onCheckedChange={() => handleToggleCart(item.id, item.in_cart)}
                    className="mt-1 h-5 w-5 rounded-md"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Du søkte etter:</p>
                          <h3 className={`text-lg font-semibold ${item.in_cart ? "line-through text-muted-foreground" : ""}`}>
                            {item.name}
                          </h3>
                        </div>
                        {item.in_cart && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            I handlekurv
                          </Badge>
                        )}
                      </div>
                      {selectedProduct && (
                        <Badge className={`${getNovaColor(selectedProduct.novaScore)} rounded-full px-3 py-1`}>
                          NOVA {selectedProduct.novaScore}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedProduct ? (
                <div className="px-5 pb-5 space-y-3">
                  {selectedProduct.novaScore > 2 && (
                    <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-xl">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p className="text-xs font-medium">
                          Sterkt bearbeidet produkt (NOVA {selectedProduct.novaScore})
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    onClick={() => navigate(`/product/${selectedProduct.ean}?listId=${listId}&storeId=${storeId}`)}
                    className={`${selectedProduct.novaScore <= 2 ? 'bg-primary/5 border-primary/20' : 'bg-secondary border-border'} border-2 p-4 rounded-xl cursor-pointer hover:border-primary transition-colors`}
                  >
                    <div className="flex gap-3">
                      <div className="bg-white p-2 rounded-lg border border-border">
                        <img
                          src={selectedProduct.image || '/placeholder.svg'}
                          alt={selectedProduct.name}
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {selectedProduct.novaScore <= 2 && <Leaf className="h-4 w-4 text-primary" />}
                          <span className="text-xs font-medium text-muted-foreground">
                            {getNovaLabel(selectedProduct.novaScore)}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground mb-1">{selectedProduct.brand}</p>
                        <p className="text-sm text-muted-foreground mb-2">{selectedProduct.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold text-primary">
                            {selectedProduct.price !== null ? `${selectedProduct.price.toFixed(2)} kr` : 'Pris ikke tilgjengelig'}
                          </p>
                          <Badge variant="outline" className="rounded-full text-xs">
                            Se detaljer →
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {alternatives.length > 0 && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(item.id)}
                        className="w-full justify-between rounded-xl hover:bg-secondary"
                      >
                        <span className="text-sm">
                          {alternatives.length} {alternatives.length === 1 ? 'alternativ' : 'alternativer'}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          {alternatives.map((suggestion) => {
                            const originalIndex = suggestions.findIndex(s => s.ean === suggestion.ean);
                            return (
                              <div
                                key={suggestion.ean}
                                onClick={() => handleSelectProduct(item.id, originalIndex)}
                                className="bg-secondary border border-border p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:border-primary transition-colors"
                              >
                                <div className="bg-white p-1 rounded-lg border border-border">
                                  <img
                                    src={suggestion.image || '/placeholder.svg'}
                                    alt={suggestion.name}
                                    className="w-12 h-12 object-contain"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">{suggestion.brand}</p>
                                  <p className="text-xs text-muted-foreground">{suggestion.name}</p>
                                  <p className="text-sm font-bold text-primary mt-1">{suggestion.price !== null ? `${suggestion.price.toFixed(2)} kr` : 'Pris ikke tilgjengelig'}</p>
                                </div>
                                <Badge className={`${getNovaColor(suggestion.novaScore)} rounded-full`}>
                                  {suggestion.novaScore}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-5 pb-5">
                  <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground">
                      Ingen produkter funnet for "{item.name}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && items.length === 0 && (
        <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Ingen varer i handlelisten</p>
        </div>
      )}

      {items.length > 0 && (
        <Card className="border-2 border-primary/30 bg-card shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Beregnet totalsum</p>
                <p className="text-3xl font-bold text-primary">{totalPrice.toFixed(2)} kr</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {items.filter(i => i.in_cart).length} av {items.length} varer i kurv
                </p>
              </div>
              {allItemsInCart && (
                <Button
                  onClick={handleCompleteList}
                  size="lg"
                  className="h-14 px-8 text-base rounded-2xl bg-primary hover:bg-primary/90"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Fullfør handleliste
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
