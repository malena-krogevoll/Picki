import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Package, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { analyzeProductMatch, sortProductsByPreference, MatchInfo, UserPreferences } from "@/lib/preferenceAnalysis";
import { PreferenceIndicators, AllergyWarningBanner } from "@/components/PreferenceIndicators";
import { groupItemsByCategory } from "@/lib/storeLayoutSort";
import { useSessionPersistence, useClearSessionCache } from "@/hooks/useSessionPersistence";

interface ItemIntent {
  original: string;
  primaryProduct: string;
  productCategory: string;
  alternativeTerms: string[];
  excludePatterns: string[];
  isGenericTerm: boolean;
}

interface ProductSuggestion {
  ean: string;
  brand: string;
  name: string;
  image: string;
  price: number | null;
  store: string;
  novaScore: number | null;
  novaIsEstimated: boolean;
  hasIngredients: boolean;
  allergener: string;
  ingredienser: string;
  matchInfo: MatchInfo;
}

interface CachedItemData {
  storeId: string;
  cachedAt: string;
  products: ProductSuggestion[];
}

interface ShoppingModeProps {
  storeId: string;
  listId: string;
  onBack: () => void;
}

const getNovaColor = (score: number | null, isEstimated: boolean = false) => {
  if (score === null) return "bg-muted text-muted-foreground border-dashed border";
  if (isEstimated) return "bg-muted text-muted-foreground border-dashed border";
  if (score <= 2) return "bg-primary text-primary-foreground";
  if (score === 3) return "bg-yellow-500 text-white";
  return "bg-destructive text-destructive-foreground";
};

const getNovaLabel = (score: number | null, hasIngredients: boolean = true) => {
  if (score === null || !hasIngredients) return "Data mangler";
  if (score <= 2) return "Ren vare";
  if (score === 3) return "Moderat bearbeidet";
  return "Sterkt bearbeidet";
};

// Helper to batch classify NOVA for multiple products at once
async function batchClassifyNova(products: { ingredienser: string; category: string }[]): Promise<Map<number, { novaScore: number | null; isEstimated: boolean; hasIngredients: boolean }>> {
  const results = new Map<number, { novaScore: number | null; isEstimated: boolean; hasIngredients: boolean }>();
  
  // Filter out products without ingredients to save API calls
  const productsWithIngredients = products
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .filter(p => p.ingredienser && p.ingredienser.trim().length > 0);
  
  // Set defaults for products without ingredients
  products.forEach((p, idx) => {
    if (!p.ingredienser || p.ingredienser.trim().length === 0) {
      results.set(idx, { novaScore: null, isEstimated: true, hasIngredients: false });
    }
  });
  
  if (productsWithIngredients.length === 0) {
    return results;
  }

  try {
    // Use batch endpoint for efficiency - send array directly to /classify-batch
    const batchPayload = productsWithIngredients.map(p => ({
      ingredients_text: p.ingredienser,
      product_category: p.category
    }));

    const response = await fetch(
      `https://hoxoaubghdifiprzfcmq.supabase.co/functions/v1/classify-nova/classify-batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhveG9hdWJnaGRpZmlwcnpmY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzkxMTUsImV4cCI6MjA4MDc1NTExNX0.ZDK6YAG_r7OH3vNjzj6Nh99rioFUILZgBjMkB3tr1Zk'
        },
        body: JSON.stringify(batchPayload) // Send array directly, not wrapped in object
      }
    );

    if (response.ok) {
      const data = await response.json();
      // Response is an array directly, not wrapped in { results: [...] }
      if (Array.isArray(data)) {
        data.forEach((result: any, idx: number) => {
          const originalIdx = productsWithIngredients[idx].originalIndex;
          results.set(originalIdx, {
            novaScore: result.nova_group ?? null,
            isEstimated: result.is_estimated ?? false,
            hasIngredients: result.has_ingredients ?? true
          });
        });
      }
    } else {
      console.warn('Batch NOVA classification failed, falling back to estimated values');
      productsWithIngredients.forEach(p => {
        results.set(p.originalIndex, { novaScore: 4, isEstimated: true, hasIngredients: true });
      });
    }
  } catch (err) {
    console.error('Batch NOVA classification error:', err);
    productsWithIngredients.forEach(p => {
      results.set(p.originalIndex, { novaScore: 4, isEstimated: true, hasIngredients: true });
    });
  }

  return results;
}

export const ShoppingMode = ({ storeId, listId, onBack }: ShoppingModeProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lists, updateItemStatus, completeList, cacheItemProducts } = useShoppingList(user?.id);
  const { profile } = useProfile(user?.id);
  const [productData, setProductData] = useState<Record<string, ProductSuggestion[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  
  // Session persistence for mobile sleep/wake
  const sessionKey = `shopping-mode-${listId}-${storeId}`;
  const cachedSessionData = useSessionPersistence<Record<string, ProductSuggestion[]>>(sessionKey, productData);
  const clearSessionCache = useClearSessionCache(sessionKey);
  
  // Track if we've already used cached data
  const usedCacheRef = useRef(false);

  const currentList = lists.find(l => l.id === listId);
  const items = currentList?.items || [];

  // Reset product data when store changes
  useEffect(() => {
    setProductData({});
    setSelectedProducts({});
    setLoading(true);
    usedCacheRef.current = false;
    clearSessionCache();
  }, [storeId, clearSessionCache]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchProducts = async () => {
      // Check session cache first (for mobile wake from sleep)
      if (!usedCacheRef.current && cachedSessionData && Object.keys(cachedSessionData).length > 0) {
        console.log('Restoring product data from session cache');
        setProductData(cachedSessionData);
        setLoading(false);
        usedCacheRef.current = true;
        return;
      }
      
      setLoading(true);

      try {
        // Check for cached product data in database
        const itemsNeedingFetch: typeof items = [];
        const cachedResults: Record<string, ProductSuggestion[]> = {};
        
        for (const item of items) {
          // Check if item has cached product data for the same store
          if (item.product_data) {
            try {
              const cached = item.product_data as unknown as CachedItemData;
              if (cached.storeId === storeId && cached.products && Array.isArray(cached.products)) {
                // Check if cache is fresh (less than 24 hours old)
                const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
                const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (cacheAge < maxCacheAge) {
                  console.log(`Using cached products for: ${item.name}`);
                  cachedResults[item.id] = cached.products;
                  continue;
                }
              }
            } catch (e) {
              // Invalid cache format, need to fetch
            }
          }
          itemsNeedingFetch.push(item);
        }

        // Apply cached results immediately
        if (Object.keys(cachedResults).length > 0 && isMounted) {
          setProductData(prev => ({ ...prev, ...cachedResults }));
        }
        
        // If all items were cached, we're done
        if (itemsNeedingFetch.length === 0) {
          if (isMounted) setLoading(false);
          return;
        }

        // Step 1: Batch analyze all item names with AI (only for items needing fetch)
        const itemNames = itemsNeedingFetch.map(i => i.name);
        let intentMap: Map<string, ItemIntent> = new Map();
        
        try {
          console.log("Fetching AI intents for items:", itemNames);
          const { data: intentData, error: intentError } = await supabase.functions.invoke('analyze-shopping-intent', {
            body: { items: itemNames }
          });
          
          if (!intentError && intentData?.intents) {
            console.log("AI intent analysis:", {
              cached: intentData.cached,
              aiProcessed: intentData.aiProcessed,
              estimatedCost: intentData.estimatedCost
            });
            
            for (const intent of intentData.intents as ItemIntent[]) {
              intentMap.set(intent.original.toLowerCase(), intent);
            }
          } else {
            console.warn("Intent analysis failed, falling back to basic search:", intentError);
          }
        } catch (intentErr) {
          console.error("Intent analysis error:", intentErr);
        }

        // Step 2: Search products with AI intent data (staggered to avoid rate limiting)
        const BATCH_SIZE = 3;
        const DELAY_BETWEEN_BATCHES = 400;
        
        const allResults: { itemId: string; products: ProductSuggestion[] }[] = [];
        
        // Helper function to process a single item
        const processItem = async (item: typeof items[0]) => {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 15000);
            });

            const intent = intentMap.get(item.name.toLowerCase());

            const fetchPromise = supabase.functions.invoke('search-products', {
              body: {
                query: item.name,
                storeId,
                userPreferences: profile?.preferences,
                intent
              }
            });

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) {
              console.error('Error fetching products for', item.name, error);
              return { itemId: item.id, products: [] as ProductSuggestion[] };
            } else if (data?.results && data.results.length > 0) {
              // Filter and prepare products for batch NOVA classification
              const filteredResults = data.results
                .filter((r: any) => r.product && r.score > -50)
                .slice(0, 5); // Limit to top 5 products
              
              // Prepare batch for NOVA classification
              const productsForNova = filteredResults.map((r: any) => ({
                ingredienser: r.product.Ingrediensliste || '',
                category: r.product.Kategori || ''
              }));
              
              // Batch classify NOVA
              const novaResults = await batchClassifyNova(productsForNova);
              
              // Build final product list with NOVA scores
              const productsWithNova: ProductSuggestion[] = filteredResults.map((r: any, idx: number) => {
                const ingredienser = r.product.Ingrediensliste || '';
                const allergener = r.product["Allergener/Kosthold"] || '';
                const novaData = novaResults.get(idx) || { novaScore: null, isEstimated: true, hasIngredients: false };
                
                const productName = r.product.Produktnavn || '';
                const brand = r.product.Merke || '';
                
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
                  novaScore: novaData.novaScore,
                  novaIsEstimated: novaData.isEstimated,
                  hasIngredients: novaData.hasIngredients,
                  allergener,
                  ingredienser,
                  matchInfo
                };
              });
              
              // Sort products by preference match, then NOVA, then price
              const sortedProducts = sortProductsByPreference(
                productsWithNova, 
                profile?.preferences as UserPreferences | null
              );
              
              // Cache products in background (fire and forget)
              cacheItemProducts(item.id, storeId, sortedProducts);
              
              return { itemId: item.id, products: sortedProducts };
            } else {
              return { itemId: item.id, products: [] as ProductSuggestion[] };
            }
          } catch (err) {
            console.error('Error fetching products for', item.name, err);
            return { itemId: item.id, products: [] as ProductSuggestion[] };
          }
        };

        // Process items in batches
        for (let i = 0; i < itemsNeedingFetch.length; i += BATCH_SIZE) {
          if (!isMounted) break;
          
          const batch = itemsNeedingFetch.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(processItem));
          allResults.push(...batchResults);
          
          // Update UI with partial results as they come in
          if (isMounted && batchResults.length > 0) {
            setProductData(prev => {
              const updated = { ...prev };
              batchResults.forEach(({ itemId, products }) => {
                updated[itemId] = products;
              });
              return updated;
            });
          }
          
          // Wait between batches (except for the last one)
          if (i + BATCH_SIZE < itemsNeedingFetch.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          }
        }

        if (!isMounted) return;

        // Final update with all results (including cached)
        if (isMounted) {
          const results: Record<string, ProductSuggestion[]> = { ...cachedResults };
          allResults.forEach(({ itemId, products }) => {
            results[itemId] = products;
          });
          setProductData(results);
        }
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
  }, [items, storeId, profile, cachedSessionData, cacheItemProducts]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Optimized: Fire-and-forget for instant checkbox response
  const handleToggleCart = (itemId: string, currentStatus: boolean) => {
    updateItemStatus(itemId, !currentStatus);
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
    clearSessionCache();
    toast.success("Handleliste fullført!", {
      description: "Listen er nå arkivert."
    });
    navigate("/dashboard");
  };

  const allItemsInCart = items.length > 0 && items.every(item => item.in_cart);

  const totalPrice = items.reduce((sum, item) => {
    const suggestions = productData[item.id] || [];
    const selectedIndex = selectedProducts[item.id] ?? 0;
    const selectedProduct = suggestions[selectedIndex];
    return sum + (selectedProduct?.price || 0) * item.quantity;
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

  if (loading && Object.keys(productData).length === 0) {
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
        {/* Loading progress indicator */}
        {loading && items.length > 0 && (
          <div className="max-w-2xl mx-auto mt-2 px-4 md:px-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>
                Laster produkter ({Object.keys(productData).length}/{items.length})
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5 mt-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${(Object.keys(productData).length / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}
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
                const isItemLoading = loading && !productData[item.id];
                
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
                          disabled={isItemLoading}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Du søkte etter:</p>
                              <h3 className={`text-base md:text-lg font-semibold truncate ${item.in_cart ? "line-through text-muted-foreground" : ""}`}>
                                {item.quantity > 1 && (
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {item.quantity}x
                                  </Badge>
                                )}
                                {item.name}
                                {item.notes && (
                                  <span className="text-xs text-muted-foreground font-normal ml-2">
                                    ({item.notes})
                                  </span>
                                )}
                              </h3>
                              {item.in_cart && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full mt-1 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  I handlekurv
                                </Badge>
                              )}
                            </div>
                            {isItemLoading ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-muted-foreground">Søker...</span>
                              </div>
                            ) : selectedProduct ? (
                              <Badge className={`${getNovaColor(selectedProduct.novaScore, selectedProduct.novaIsEstimated)} rounded-full px-2 md:px-3 py-1 text-xs flex-shrink-0`}>
                                {!selectedProduct.hasIngredients ? (
                                  <><HelpCircle className="h-3 w-3 mr-1" />Ukjent</>
                                ) : (
                                  <>NOVA {selectedProduct.novaScore}</>
                                )}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loading skeleton for item */}
                    {isItemLoading && (
                      <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-3">
                        <div className="flex gap-3">
                          <Skeleton className="h-16 w-16 md:h-20 md:w-20 rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        </div>
                      </div>
                    )}

                    {!isItemLoading && selectedProduct ? (
                      <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-3">
                        {/* Show allergen warning if ALL products have allergen warnings */}
                        {allHaveAllergyWarnings && (
                          <AllergyWarningBanner allergyWarnings={commonAllergyWarnings} />
                        )}
                        
                        {!selectedProduct.hasIngredients && (
                          <div className="bg-muted border border-border p-3 rounded-xl">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <HelpCircle className="h-4 w-4 flex-shrink-0" />
                              <p className="text-xs font-medium">
                                Ingrediensdata mangler – sjekk emballasjen for allergiinformasjon
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedProduct.hasIngredients && selectedProduct.novaScore !== null && selectedProduct.novaScore > 2 && (
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
                                {selectedProduct.hasIngredients && selectedProduct.novaScore !== null && selectedProduct.novaScore <= 2 && <Leaf className="h-4 w-4 text-primary flex-shrink-0" />}
                                {!selectedProduct.hasIngredients && <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                                <span className="text-xs font-medium text-muted-foreground truncate">
                                  {getNovaLabel(selectedProduct.novaScore, selectedProduct.hasIngredients)}
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
                                      <Badge className={`${getNovaColor(suggestion.novaScore, suggestion.novaIsEstimated)} rounded-full flex-shrink-0`}>
                                          {!suggestion.hasIngredients ? '?' : suggestion.novaScore}
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
                    ) : !isItemLoading ? (
                      <div className="px-4 pb-4 md:px-5 md:pb-5">
                        <div className="bg-secondary/50 p-4 rounded-xl border border-border">
                          <p className="text-sm text-muted-foreground">
                            Ingen produkter funnet for "{item.name}"
                          </p>
                        </div>
                      </div>
                    ) : null}
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
