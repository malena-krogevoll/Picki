import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { analyzeProductMatch, sortProductsByPreference, MatchInfo, UserPreferences } from "@/lib/preferenceAnalysis";
import { PreferenceIndicators, AllergyWarningBanner } from "@/components/PreferenceIndicators";
import { groupItemsByCategory } from "@/lib/storeLayoutSort";

interface ProductSuggestion {
  ean: string;
  brand: string;
  name: string;
  image: string;
  price: number | null;
  store: string;
  novaScore: number;
  allergener: string;
  ingredienser: string;
  matchInfo: MatchInfo;
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

  // Reset product data when store changes
  useEffect(() => {
    setProductData({});
    setSelectedProducts({});
    setLoading(true);
  }, [storeId]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);

      try {
        const productPromises = items.map(async (item) => {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 8000);
            });

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
            } else if (data?.results && data.results.length > 0) {
              // Transform API response and get real NOVA classification for each product
              const productsWithNova: ProductSuggestion[] = await Promise.all(
                data.results
                  .filter((r: any) => r.product)
                  .map(async (r: any) => {
                    let novaScore = 2; // Fallback only if no ingredients
                    const ingredienser = r.product.Ingrediensliste || '';
                    const allergener = r.product["Allergener/Kosthold"] || '';
                    
                    if (ingredienser) {
                      try {
                        const { data: novaData, error: novaError } = await supabase.functions.invoke('classify-nova', {
                          body: { ingredients_text: ingredienser }
                        });
                        
                        if (!novaError && novaData?.nova_group) {
                          novaScore = novaData.nova_group;
                        } else {
                          console.warn('NOVA classification returned no data for:', r.product.Produktnavn);
                        }
                      } catch (err) {
                        console.error('NOVA classification failed for product:', r.product.Produktnavn, err);
                      }
                    } else {
                      console.warn('No ingredients found for product:', r.product.Produktnavn);
                    }
                    
                    const productName = r.product.Produktnavn || '';
                    const brand = r.product.Merke || '';
                    
                    // Analyze product match against user preferences
                    const matchInfo = analyzeProductMatch(
                      { name: productName, brand, allergener, ingredienser },
                      profile?.preferences as UserPreferences | null
                    );
                    
                    return {
                      ean: r.product.EAN || '',
                      brand,
                      name: productName,
                      image: r.product.Produktbilde_URL || '',
                      price: parseFloat(r.product.Pris) || null,
                      store: r.product.StoreCode || storeId,
                      novaScore,
                      allergener,
                      ingredienser,
                      matchInfo
                    };
                  })
              );
              
              // Sort products by preference match, then NOVA, then price
              const sortedProducts = sortProductsByPreference(
                productsWithNova, 
                profile?.preferences as UserPreferences | null
              );
              
              return { itemId: item.id, products: sortedProducts };
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

  const totalPrice = items.reduce((sum, item) => {
    const suggestions = productData[item.id] || [];
    const selectedIndex = selectedProducts[item.id] ?? 0;
    const selectedProduct = suggestions[selectedIndex];
    return sum + (selectedProduct?.price || 0);
  }, 0);

  // Group items by store layout categories
  const groupedItems = useMemo(() => {
    return groupItemsByCategory(items, (itemId) => {
      const suggestions = productData[itemId] || [];
      const selectedIndex = selectedProducts[itemId] ?? 0;
      const selectedProduct = suggestions[selectedIndex];
      return selectedProduct ? { name: selectedProduct.name, brand: selectedProduct.brand } : undefined;
    });
  }, [items, productData, selectedProducts]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 md:px-0 md:py-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:static">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <Button variant="outline" onClick={onBack} className="rounded-2xl h-11 touch-target">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
            <Badge variant="outline" className="text-base px-4 py-2 rounded-full">
              {storeId.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        <div className="flex-1 px-4 py-4 md:px-0 space-y-4 max-w-2xl mx-auto w-full">
          {items.map((item) => (
            <div key={item.id} className="bg-card border-2 border-border rounded-2xl p-4 md:p-5">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-24 md:h-32 w-full mb-3" />
              <Skeleton className="h-16 md:h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-0">
      {/* Sticky header for mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 md:px-0 md:py-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:static">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button variant="outline" onClick={onBack} className="rounded-2xl h-11 touch-target">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Tilbake</span>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm md:text-base px-3 md:px-4 py-2 rounded-full">
              {storeId.toUpperCase()}
            </Badge>
            {allItemsInCart && (
              <Button onClick={handleCompleteList} className="bg-primary hover:bg-primary/90 rounded-2xl h-11 touch-target hidden sm:flex">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Fullfør
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 px-4 py-4 md:px-0 overflow-y-auto touch-scroll">
        <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto pb-32 md:pb-6">
          {groupedItems.map((group) => (
            <div key={group.category} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2 px-1 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-5">
                <span className="text-lg">{group.emoji}</span>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.category}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Items in this category */}
              {group.items.map((item) => {
                const suggestions = productData[item.id] || [];
                const selectedIndex = selectedProducts[item.id] ?? 0;
                const selectedProduct = suggestions[selectedIndex];
                const alternatives = suggestions.filter((_, idx) => idx !== selectedIndex);
                const isExpanded = expandedItems.has(item.id);
                
                // Check if ALL products have allergen warnings (no safe alternatives)
                const allHaveAllergyWarnings = suggestions.length > 0 && 
                  suggestions.every(s => s.matchInfo.allergyWarnings.length > 0);
                const commonAllergyWarnings = allHaveAllergyWarnings && selectedProduct
                  ? selectedProduct.matchInfo.allergyWarnings
                  : [];

                return (
                  <div key={item.id} className={`bg-card border-2 rounded-2xl overflow-hidden transition-all ${item.in_cart ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                    <div className="p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.in_cart}
                          onCheckedChange={() => handleToggleCart(item.id, item.in_cart)}
                          className="mt-1 h-6 w-6 md:h-5 md:w-5 rounded-md touch-target"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Du søkte etter:</p>
                              <h3 className={`text-base md:text-lg font-semibold truncate ${item.in_cart ? "line-through text-muted-foreground" : ""}`}>
                                {item.name}
                              </h3>
                              {item.in_cart && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full mt-1 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  I handlekurv
                                </Badge>
                              )}
                            </div>
                            {selectedProduct && (
                              <Badge className={`${getNovaColor(selectedProduct.novaScore)} rounded-full px-2 md:px-3 py-1 text-xs flex-shrink-0`}>
                                NOVA {selectedProduct.novaScore}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedProduct ? (
                      <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-3">
                        {/* Show allergen warning if ALL products have allergen warnings */}
                        {allHaveAllergyWarnings && (
                          <AllergyWarningBanner allergyWarnings={commonAllergyWarnings} />
                        )}
                        
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
                          className={`${
                            selectedProduct.matchInfo.allergyWarnings.length > 0 
                              ? 'bg-destructive/5 border-destructive/30' 
                              : selectedProduct.novaScore <= 2 
                                ? 'bg-primary/5 border-primary/20' 
                                : 'bg-secondary border-border'
                          } border-2 p-3 md:p-4 rounded-xl cursor-pointer active:scale-[0.98] transition-all`}
                        >
                          <div className="flex gap-3">
                            <div className="bg-white p-2 rounded-lg border border-border flex-shrink-0">
                              <img
                                src={selectedProduct.image || '/placeholder.svg'}
                                alt={selectedProduct.name}
                                className="w-14 h-14 md:w-16 md:h-16 object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {selectedProduct.novaScore <= 2 && <Leaf className="h-4 w-4 text-primary flex-shrink-0" />}
                                <span className="text-xs font-medium text-muted-foreground truncate">
                                  {getNovaLabel(selectedProduct.novaScore)}
                                </span>
                              </div>
                              <p className="font-semibold text-foreground mb-1 truncate">{selectedProduct.brand}</p>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{selectedProduct.name}</p>
                              
                              {/* Preference indicators */}
                              <PreferenceIndicators 
                                matchInfo={selectedProduct.matchInfo} 
                                userPreferences={profile?.preferences as UserPreferences | null}
                                compact
                              />
                              
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <p className="text-base font-bold text-primary">
                                  {selectedProduct.price !== null ? `${selectedProduct.price.toFixed(2)} kr` : 'Pris ikke tilgjengelig'}
                                </p>
                                <Badge variant="outline" className="rounded-full text-xs flex-shrink-0">
                                  Detaljer →
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
                              className="w-full justify-between rounded-xl hover:bg-secondary h-11 touch-target"
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
                                  const hasAllergyWarning = suggestion.matchInfo.allergyWarnings.length > 0;
                                  return (
                                    <div
                                      key={suggestion.ean}
                                      onClick={() => handleSelectProduct(item.id, originalIndex)}
                                      className={`${
                                        hasAllergyWarning 
                                          ? 'bg-destructive/5 border-destructive/30' 
                                          : 'bg-secondary border-border'
                                      } border p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all touch-target`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="bg-white p-1 rounded-lg border border-border flex-shrink-0">
                                          <img
                                            src={suggestion.image || '/placeholder.svg'}
                                            alt={suggestion.name}
                                            className="w-10 h-10 md:w-12 md:h-12 object-contain"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold truncate">{suggestion.brand}</p>
                                          <p className="text-xs text-muted-foreground truncate">{suggestion.name}</p>
                                          <p className="text-sm font-bold text-primary mt-1">
                                            {suggestion.price !== null ? `${suggestion.price.toFixed(2)} kr` : 'Pris ikke tilgjengelig'}
                                          </p>
                                        </div>
                                        <Badge className={`${getNovaColor(suggestion.novaScore)} rounded-full flex-shrink-0`}>
                                          {suggestion.novaScore}
                                        </Badge>
                                      </div>
                                      <PreferenceIndicators 
                                        matchInfo={suggestion.matchInfo} 
                                        userPreferences={profile?.preferences as UserPreferences | null}
                                        compact
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 pb-4 md:px-5 md:pb-5">
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
          ))}

          {items.length === 0 && (
            <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Ingen varer i handlelisten</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer for mobile */}
      {items.length > 0 && (
        <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border safe-bottom md:relative md:bg-transparent md:backdrop-blur-none md:border-0">
          <div className="max-w-2xl mx-auto p-4 md:p-0 md:mt-6">
            <Card className="border-2 border-primary/30 bg-card shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Beregnet totalsum</p>
                    <p className="text-2xl md:text-3xl font-bold text-primary">{totalPrice.toFixed(2)} kr</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {items.filter(i => i.in_cart).length} av {items.length} varer i kurv
                    </p>
                  </div>
                  {allItemsInCart && (
                    <Button
                      onClick={handleCompleteList}
                      size="lg"
                      className="h-12 md:h-14 px-4 md:px-8 text-sm md:text-base rounded-2xl bg-primary hover:bg-primary/90 touch-target flex-shrink-0"
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      <span className="hidden sm:inline">Fullfør handleliste</span>
                      <span className="sm:hidden">Fullfør</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
