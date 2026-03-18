import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Package, HelpCircle, Home, Pencil, Store, ChefHat, List, LayoutList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { analyzeProductMatch, sortProductsByPreference, MatchInfo, UserPreferences } from "@/lib/preferenceAnalysis";
import { PreferenceIndicators, AllergyWarningBanner } from "@/components/PreferenceIndicators";
import { groupItemsByCategory } from "@/lib/storeLayoutSort";
import { StoreSelectorDialog, getStoreName, getStoreIcon, getStoreColor } from "@/components/StoreSelectorDialog";
import { useDiyAlternatives, DiyRecipe } from "@/hooks/useDiyAlternatives";
import { DiyAlternativeDialog } from "@/components/DiyAlternativeDialog";
import { getCountryFromEAN } from "@/utils/countryUtils";
import { CountryFlag } from "@/components/CountryFlag";

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

interface EpdEnrichmentSource {
  ingredients_raw: string | null;
  payload?: {
    ingredientStatement?: string;
    mainImageUrl?: string;
    [key: string]: unknown;
  } | null;
  image_url?: string | null;
}

const hasMeaningfulIngredients = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return !normalized.toLowerCase().includes('ingen ingrediensinformasjon');
};

interface CachedItemData {
  storeId: string;
  cachedAt: string;
  products: ProductSuggestion[];
  selectedIndex?: number; // Store selected product index in cache
}

interface ShoppingModeProps {
  storeId: string;
  listId: string;
  onEditList: () => void;
  onChangeStore: (newStoreId: string) => void;
}

// Export session cache for external cache invalidation
export const sessionProductCache = new Map<string, {
  products: Record<string, ProductSuggestion[]>;
  selections: Record<string, number>;
  fetchedItems: Set<string>;
}>();

export const clearSessionCache = (listId: string, storeId: string) => {
  const cacheKey = `${listId}:${storeId}`;
  sessionProductCache.delete(cacheKey);
};

export const clearSessionCacheForList = (listId: string) => {
  for (const key of sessionProductCache.keys()) {
    if (key.startsWith(`${listId}:`)) {
      sessionProductCache.delete(key);
    }
  }
};

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
    // Use supabase.functions.invoke to include user JWT automatically
    const batchPayload = productsWithIngredients.map(p => ({
      ingredients_text: p.ingredienser,
      product_category: p.category
    }));

    const { data, error } = await supabase.functions.invoke('classify-nova/classify-batch', {
      body: batchPayload
    });

    if (!error && Array.isArray(data)) {
      data.forEach((result: any, idx: number) => {
        const originalIdx = productsWithIngredients[idx].originalIndex;
        results.set(originalIdx, {
          novaScore: result.nova_group ?? null,
          isEstimated: result.is_estimated ?? false,
          hasIngredients: result.has_ingredients ?? true
        });
      });
    } else {
      console.warn('Batch NOVA classification failed:', error);
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

export const ShoppingMode = ({ storeId, listId, onEditList, onChangeStore }: ShoppingModeProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lists, updateItemStatus, completeList, cacheItemProducts, updateCachedSelectedIndex, addItem, removeItem } = useShoppingList(user?.id);
  const { profile } = useProfile(user?.id);
  const { findDiyAlternative } = useDiyAlternatives();
  
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [diyDialogOpen, setDiyDialogOpen] = useState(false);
  const [selectedDiyRecipe, setSelectedDiyRecipe] = useState<DiyRecipe | null>(null);
  const [selectedDiyItemId, setSelectedDiyItemId] = useState<string | null>(null);
  const [selectedDiyItemName, setSelectedDiyItemName] = useState<string>("");
  const [dismissedDiyItems, setDismissedDiyItems] = useState<Set<string>>(new Set());
  const [compactView, setCompactView] = useState(() => {
    try { return localStorage.getItem('picki-compact-view') === 'true'; } catch { return false; }
  });

  const toggleCompactView = useCallback(() => {
    setCompactView(prev => {
      const next = !prev;
      try { localStorage.setItem('picki-compact-view', String(next)); } catch {}
      return next;
    });
  }, []);
  
  // Get cache key for this list+store combination
  const cacheKey = `${listId}:${storeId}`;
  
  // Initialize from session cache if available
  const sessionCache = sessionProductCache.get(cacheKey);
  
  // When restoring from session cache, filter out items that had empty results
  // so they get re-fetched (the empty result may have been due to a temporary failure)
  const validFetchedItems = useMemo(() => {
    if (!sessionCache) return new Set<string>();
    const valid = new Set<string>();
    for (const itemId of sessionCache.fetchedItems) {
      const products = sessionCache.products[itemId];
      if (products && products.length > 0) {
        valid.add(itemId);
      }
    }
    return valid;
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Check if the session cache has any actual products
  const sessionCacheHasProducts = sessionCache 
    ? Object.values(sessionCache.products).some(p => p && p.length > 0)
    : false;
  
  const [productData, setProductData] = useState<Record<string, ProductSuggestion[]>>(
    sessionCache?.products || {}
  );
  const [loading, setLoading] = useState(!sessionCacheHasProducts);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>(
    sessionCache?.selections || {}
  );
  
  // Track fetched items - initialize from session cache (only items with actual results)
  const fetchedItemsRef = useRef<Set<string>>(validFetchedItems);
  const prevStoreIdRef = useRef(storeId);
  const prevCacheKeyRef = useRef(cacheKey);

  const currentList = lists.find(l => l.id === listId);
  const items = currentList?.items || [];

  // Persist to session cache whenever data changes
  useEffect(() => {
    if (Object.keys(productData).length > 0 || Object.keys(selectedProducts).length > 0) {
      sessionProductCache.set(cacheKey, {
        products: productData,
        selections: selectedProducts,
        fetchedItems: fetchedItemsRef.current
      });
    }
  }, [productData, selectedProducts, cacheKey]);

  // Sync selections from DB when items update (e.g. after product swap in ProductDetail)
  useEffect(() => {
    let changed = false;
    const updatedSelections = { ...selectedProducts };
    for (const item of items) {
      if (item.product_data && item.selected_product_ean) {
        try {
          const cached = item.product_data as unknown as CachedItemData;
          if (cached.products && Array.isArray(cached.products)) {
            const dbIndex = cached.products.findIndex(p => p.ean === item.selected_product_ean);
            if (dbIndex !== -1 && updatedSelections[item.id] !== dbIndex) {
              updatedSelections[item.id] = dbIndex;
              changed = true;
            }
          }
        } catch {}
      }
    }
    if (changed) {
      setSelectedProducts(updatedSelections);
    }
  }, [items]);

  // Combined effect: detect store/list changes, reset data, and fetch products
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // Detect store/list change via cache key
    const cacheKeyChanged = prevCacheKeyRef.current !== cacheKey;
    
    if (cacheKeyChanged) {
      prevCacheKeyRef.current = cacheKey;
      prevStoreIdRef.current = storeId;
      
      const existingCache = sessionProductCache.get(cacheKey);
      if (existingCache) {
        // Restore from session cache - no fetch needed
        setProductData(existingCache.products);
        setSelectedProducts(existingCache.selections);
        fetchedItemsRef.current = existingCache.fetchedItems;
        setLoading(false);
        return;
      } else {
        // New combination - clear everything, will fetch below
        setProductData({});
        setSelectedProducts({});
        fetchedItemsRef.current = new Set();
        setLoading(true);
      }
    }

    const fetchProducts = async () => {
      try {
        const itemsNeedingFetch: typeof items = [];
        const cachedResults: Record<string, ProductSuggestion[]> = {};
        const cachedSelections: Record<string, number> = {};
        
        for (const item of items) {
          // On store change, skip all caches - fetch everything fresh
          if (cacheKeyChanged) {
            itemsNeedingFetch.push(item);
            continue;
          }
          
          // Skip if already fetched in this session
          if (fetchedItemsRef.current.has(item.id)) {
            continue;
          }
          
          // Check DB-cached product data for the same store
          if (item.product_data) {
            try {
              const cached = item.product_data as unknown as CachedItemData;
              if (cached.storeId === storeId && cached.products && Array.isArray(cached.products)) {
                const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
                const maxCacheAge = 24 * 60 * 60 * 1000;
                
                if (cacheAge < maxCacheAge) {
                  cachedResults[item.id] = cached.products;
                  fetchedItemsRef.current.add(item.id);
                  if (typeof cached.selectedIndex === 'number') {
                    cachedSelections[item.id] = cached.selectedIndex;
                  }
                  continue;
                }
              }
            } catch (e) {
              // Invalid cache format
            }
          }
          itemsNeedingFetch.push(item);
        }

        if (Object.keys(cachedResults).length > 0 && isMounted) {
          setProductData(prev => ({ ...prev, ...cachedResults }));
          if (Object.keys(cachedSelections).length > 0) {
            setSelectedProducts(prev => ({ ...prev, ...cachedSelections }));
          }
        }
        
        if (itemsNeedingFetch.length === 0) {
          if (isMounted) setLoading(false);
          return;
        }

        setLoading(true);

        // Step 1: Batch analyze item names with AI
        const itemNames = itemsNeedingFetch.map(i => i.name);
        let intentMap: Map<string, ItemIntent> = new Map();
        
        try {
          const { data: intentData, error: intentError } = await supabase.functions.invoke('analyze-shopping-intent', {
            body: { items: itemNames }
          });
          
          if (!intentError && intentData?.intents) {
            for (const intent of intentData.intents as ItemIntent[]) {
              intentMap.set(intent.original.toLowerCase(), intent);
            }
          } else {
            console.warn("Intent analysis failed:", intentError);
          }
        } catch (intentErr) {
          console.error("Intent analysis error:", intentErr);
        }

        // Step 2: Search products in batches
        const BATCH_SIZE = 3;
        const DELAY_BETWEEN_BATCHES = 400;
        const allResults: { itemId: string; products: ProductSuggestion[] }[] = [];
        
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
              const filteredResults = data.results
                .filter((r: any) => r.product && r.score > -50)
                .slice(0, 5);
              
              const productsForNova = filteredResults.map((r: any) => ({
                ingredienser: r.product.Ingrediensliste || '',
                category: r.product.Kategori || ''
              }));
              
              const novaResults = await batchClassifyNova(productsForNova);
              
              const productsWithNova: ProductSuggestion[] = filteredResults.map((r: any, idx: number) => {
                const ingredienser = r.product.Ingrediensliste || r.product.ingredients || '';
                const allergener = r.product["Allergener/Kosthold"] || r.product.allergens || '';
                const novaData = novaResults.get(idx) || { novaScore: null, isEstimated: true, hasIngredients: false };
                const productName = r.product.Produktnavn || r.product.name || '';
                const brand = r.product.Merke || r.product.brand || '';
                const image = r.product.Produktbilde_URL || r.product.image || '';
                const ean = r.product.EAN || r.product.ean || '';
                const store = r.product.StoreCode || r.product.store || storeId;
                const rawPrice = r.product.Pris ?? r.product.price;
                const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice ?? '')) || null;
                
                const matchInfo = analyzeProductMatch(
                  { name: productName, brand, allergener, ingredienser },
                  profile?.preferences as UserPreferences | null
                );
                
                return {
                  ean,
                  brand,
                  name: productName,
                  image,
                  price,
                  store,
                  novaScore: novaData.novaScore,
                  novaIsEstimated: novaData.isEstimated,
                  hasIngredients: novaData.hasIngredients,
                  allergener,
                  ingredienser,
                  matchInfo
                };
              });
              
              const sortedProducts = sortProductsByPreference(
                productsWithNova, 
                profile?.preferences as UserPreferences | null
              );
              
              cacheItemProducts(item.id, storeId, sortedProducts);
              fetchedItemsRef.current.add(item.id);
              return { itemId: item.id, products: sortedProducts };
            } else {
              fetchedItemsRef.current.add(item.id);
              return { itemId: item.id, products: [] as ProductSuggestion[] };
            }
          } catch (err) {
            console.error('Error fetching products for', item.name, err);
            return { itemId: item.id, products: [] as ProductSuggestion[] };
          }
        };

        for (let i = 0; i < itemsNeedingFetch.length; i += BATCH_SIZE) {
          if (!isMounted) break;
          
          const batch = itemsNeedingFetch.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(processItem));
          allResults.push(...batchResults);
          
          if (isMounted && batchResults.length > 0) {
            setProductData(prev => {
              const updated = { ...prev };
              batchResults.forEach(({ itemId, products }) => {
                updated[itemId] = products;
              });
              return updated;
            });
          }
          
          if (i + BATCH_SIZE < itemsNeedingFetch.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          }
        }

        if (!isMounted) return;

        if (isMounted) {
          const results: Record<string, ProductSuggestion[]> = { ...cachedResults };
          allResults.forEach(({ itemId, products }) => {
            results[itemId] = products;
          });
          setProductData(prev => ({ ...prev, ...results }));
        }
      } catch (error) {
        console.error('Error in fetchProducts:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Fetch if store changed or items still need data
    const hasDataForAllItems = !cacheKeyChanged && items.length > 0 && items.every(
      item => fetchedItemsRef.current.has(item.id)
    );
    
    if (items.length > 0 && !hasDataForAllItems) {
      fetchProducts();
    } else if (!cacheKeyChanged) {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [listId, storeId, items.length, cacheKey]);

  // Post-load enrichment: fetch details for candidates missing ingredients/image
  // Enrich top 3 candidates per item, auto-promote best candidate with data
  const enrichedEansRef = useRef<Set<string>>(new Set());
  const enrichmentRunningRef = useRef(false);
  const productDataRef = useRef(productData);
  productDataRef.current = productData;
  
  const prevLoadingRef = useRef(loading);
  
  useEffect(() => {
    prevLoadingRef.current = loading;
    
    if (loading) return;
    if (Object.keys(productData).length === 0) return;
    if (enrichmentRunningRef.current) return;
    
    let cancelled = false;
    enrichmentRunningRef.current = true;
    
    const enrichMissing = async () => {
      // Collect EANs to enrich: top 3 candidates per item that lack data
      const toEnrich: { itemId: string; productIndex: number; ean: string }[] = [];
      const currentData = productDataRef.current;
      
      for (const item of items) {
        const suggestions = currentData[item.id];
        if (!suggestions || suggestions.length === 0) continue;
        
        // Enrich up to 3 candidates per item (not just the selected one)
        const candidateCount = Math.min(3, suggestions.length);
        for (let idx = 0; idx < candidateCount; idx++) {
          const product = suggestions[idx];
          if (!product || !product.ean) continue;
          if (enrichedEansRef.current.has(product.ean)) continue;
          
          const hasRealIngredients = product.hasIngredients && hasMeaningfulIngredients(product.ingredienser);
          const hasImage = !!product.image && product.image.length > 0;
          
          if (hasRealIngredients && hasImage) continue;
          
          toEnrich.push({ itemId: item.id, productIndex: idx, ean: product.ean });
        }
      }
      
      if (toEnrich.length === 0) {
        enrichmentRunningRef.current = false;
        return;
      }
      
      console.log(`Post-load enrichment: enriching ${toEnrich.length} candidates across items`);
      
      for (let i = 0; i < toEnrich.length && !cancelled; i++) {
        const { itemId, productIndex, ean } = toEnrich[i];
        
        try {
          // Fetch cached sources first (cheap), live detail as fallback
          const [epdResult, kassalResult] = await Promise.all([
            supabase.from('product_sources')
              .select('ingredients_raw, image_url, payload')
              .eq('ean', ean)
              .eq('source', 'EPD')
              .maybeSingle(),
            supabase.from('product_sources')
              .select('ingredients_raw, image_url, payload')
              .eq('ean', ean)
              .eq('source', 'KASSALAPP')
              .maybeSingle()
          ]);
          
          const epd = (epdResult.data as EpdEnrichmentSource | null) ?? null;
          const kassal = (kassalResult.data as EpdEnrichmentSource | null) ?? null;
          
          // Check if cached sources have the data we need
          const cachedImage = epd?.image_url || epd?.payload?.mainImageUrl || kassal?.image_url || (kassal?.payload as any)?.image;
          const cachedIngredients = epd?.ingredients_raw || epd?.payload?.ingredientStatement || kassal?.ingredients_raw || (kassal?.payload as any)?.ingredients;
          
          let details: any = null;
          
          // Only call live API if cached sources don't have what we need
          if (!cachedImage || !hasMeaningfulIngredients(cachedIngredients)) {
            try {
              const detailResult = await supabase.functions.invoke('get-product-details', { body: { ean } });
              if (!detailResult.error && detailResult.data) {
                details = detailResult.data;
              }
              // If the edge function returned rate_limited, don't block — just use cached data
            } catch {
              // Non-blocking: live detail is optional
            }
          }
          
          if (!details && !epd && !kassal) {
            // No data from any source — DON'T mark as enriched so we can retry later
            console.log(`Enrichment: no data for EAN ${ean}, will retry later`);
            continue;
          }
          
          // Mark as enriched only on success
          enrichedEansRef.current.add(ean);
          
          if (cancelled) break;
          
          const currentSuggestions = productDataRef.current[itemId];
          if (!currentSuggestions) continue;
          
          const updatedSuggestions = [...currentSuggestions];
          const product = { ...updatedSuggestions[productIndex] };
          
          let changed = false;
          
          const bestImage = epd?.image_url || epd?.payload?.mainImageUrl || kassal?.image_url || (kassal?.payload as any)?.image || details?.image;
          if (bestImage && bestImage !== product.image) {
            product.image = bestImage;
            changed = true;
          }
          
          const epdIngredients = epd?.ingredients_raw || epd?.payload?.ingredientStatement || null;
          const kassalIngredients = kassal?.ingredients_raw || (kassal?.payload as any)?.ingredients || null;
          const detailIngredients = hasMeaningfulIngredients(details?.ingredients) ? details?.ingredients : null;
          const bestIngredients = epdIngredients || kassalIngredients || detailIngredients;
          
          if (bestIngredients && (!hasMeaningfulIngredients(product.ingredienser) || product.ingredienser !== bestIngredients)) {
            product.ingredienser = bestIngredients;
            product.hasIngredients = true;
            changed = true;
            
            try {
              const novaResults = await batchClassifyNova([{ ingredienser: bestIngredients, category: '' }]);
              const novaData = novaResults.get(0);
              if (novaData) {
                product.novaScore = novaData.novaScore;
                product.novaIsEstimated = novaData.isEstimated;
                product.hasIngredients = novaData.hasIngredients;
              }
            } catch {}
            
            product.matchInfo = analyzeProductMatch(
              { name: product.name, brand: product.brand, allergener: product.allergener, ingredienser: product.ingredienser },
              profile?.preferences as UserPreferences | null
            );
          }
          
          if (changed) {
            updatedSuggestions[productIndex] = product;
            
            if (!cancelled) {
              setProductData(prev => ({ ...prev, [itemId]: updatedSuggestions }));
              void cacheItemProducts(itemId, storeId, updatedSuggestions, selectedProducts[itemId] ?? 0);
              console.log(`Enrichment: "${items.find(i => i.id === itemId)?.name}" candidate[${productIndex}] EAN=${ean}: image=${!!product.image}, ingredients=${hasMeaningfulIngredients(product.ingredienser)}`);
            }
          }
        } catch (err) {
          // Don't mark as enriched on error — allow retry
          console.warn(`Enrichment failed for EAN ${ean}:`, err);
        }
        
        // Delay between requests
        if (i + 1 < toEnrich.length) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      // After all enrichment, auto-promote best candidate per item
      if (!cancelled) {
        const promotions: Record<string, number> = {};
        const latestData = productDataRef.current;
        
        for (const item of items) {
          const suggestions = latestData[item.id];
          if (!suggestions || suggestions.length <= 1) continue;
          
          const currentIdx = selectedProducts[item.id] ?? 0;
          const currentProduct = suggestions[currentIdx];
          
          // Only promote if current selection lacks data
          const currentHasData = currentProduct && 
            hasMeaningfulIngredients(currentProduct.ingredienser) && 
            !!currentProduct.image && currentProduct.image.length > 0;
          
          if (currentHasData) continue;
          
          // Find first candidate with both image and ingredients
          const betterIdx = suggestions.findIndex((s, idx) => 
            idx !== currentIdx && 
            hasMeaningfulIngredients(s.ingredienser) && 
            !!s.image && s.image.length > 0
          );
          
          if (betterIdx >= 0) {
            promotions[item.id] = betterIdx;
            console.log(`Auto-promote: "${item.name}" from candidate[${currentIdx}] to candidate[${betterIdx}] (${suggestions[betterIdx].brand} ${suggestions[betterIdx].name})`);
          }
        }
        
        if (Object.keys(promotions).length > 0) {
          setSelectedProducts(prev => ({ ...prev, ...promotions }));
          // Persist promotions
          for (const [itemId, newIdx] of Object.entries(promotions)) {
            void updateCachedSelectedIndex(itemId, newIdx);
          }
        }
      }
      
      enrichmentRunningRef.current = false;
    };
    
    enrichMissing();
    
    return () => { cancelled = true; enrichmentRunningRef.current = false; };
  }, [loading, items.length]);

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
    // Persist selected product index AND selected_product_ean to DB
    updateCachedSelectedIndex(itemId, productIndex);
    const suggestions = productData[itemId] || [];
    const selectedEan = suggestions[productIndex]?.ean || null;
    if (selectedEan) {
      supabase.from('shopping_list_items')
        .update({ selected_product_ean: selectedEan })
        .eq('id', itemId)
        .then(({ error }) => {
          if (error) console.warn('Failed to persist selected_product_ean:', error);
        });
    }
    toast.success("Produkt byttet");
  };

  // DIY Alternative handlers
  const handleShowDiyAlternative = (itemId: string, itemName: string, recipe: DiyRecipe) => {
    setSelectedDiyItemId(itemId);
    setSelectedDiyItemName(itemName);
    setSelectedDiyRecipe(recipe);
    setDiyDialogOpen(true);
  };

  const handleAddDiyIngredients = async (ingredients: { name: string; quantity: string | null; unit: string | null }[]) => {
    if (!selectedDiyItemId) return;
    
    // Remove the original item
    await removeItem(selectedDiyItemId);
    
    // Add all DIY ingredients
    for (const ing of ingredients) {
      const ingredientName = ing.name;
      await addItem(listId, ingredientName);
    }
    
    // Mark this item as handled so we don't show the prompt again
    setDismissedDiyItems(prev => new Set(prev).add(selectedDiyItemId));
    
    toast.success("Byttet til hjemmelaget", {
      description: `${ingredients.length} ingredienser lagt til`
    });
    
    // Reset state
    setSelectedDiyItemId(null);
    setSelectedDiyRecipe(null);
  };

  const handleDismissDiy = () => {
    if (selectedDiyItemId) {
      setDismissedDiyItems(prev => new Set(prev).add(selectedDiyItemId));
    }
    setSelectedDiyItemId(null);
    setSelectedDiyRecipe(null);
  };

  const handleCompleteList = async () => {
    await completeList(listId);
    toast.success("Handleliste fullført!", {
      description: "Listen er nå arkivert."
    });
    navigate("/");
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

  const StoreIconComponent = getStoreIcon(storeId);

  if (loading && Object.keys(productData).length === 0) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 md:px-0 md:py-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:static">
          <div className="flex items-center justify-between max-w-2xl mx-auto gap-2">
            <Button variant="outline" onClick={() => navigate("/")} className="rounded-2xl h-11 touch-target">
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Hjem</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowStoreDialog(true)}
              className="rounded-2xl h-11 touch-target flex-1 max-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <StoreIconComponent className={`h-4 w-4 ${getStoreColor(storeId)}`} />
                <span className="text-sm font-medium truncate">{getStoreName(storeId)}</span>
              </div>
              <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
            </Button>
            <Button variant="outline" onClick={onEditList} className="rounded-2xl h-11 touch-target">
              <Pencil className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Rediger</span>
            </Button>
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

        <StoreSelectorDialog
          open={showStoreDialog}
          onOpenChange={setShowStoreDialog}
          onSelectStore={onChangeStore}
          currentStoreId={storeId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-0">
      {/* Sticky header for mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 md:px-0 md:py-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:static">
        <div className="flex items-center justify-between max-w-2xl mx-auto gap-1 sm:gap-2">
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-2xl h-11 w-11 sm:w-auto touch-target p-0 sm:px-4">
            <Home className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Hjem</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowStoreDialog(true)}
            className="rounded-2xl h-11 touch-target flex-1 min-w-0 max-w-[140px] sm:max-w-[180px] justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <StoreIconComponent className={`h-4 w-4 shrink-0 ${getStoreColor(storeId)}`} />
              <span className="text-sm font-medium truncate">{getStoreName(storeId)}</span>
            </div>
            <ChevronDown className="h-3 w-3 ml-0.5 opacity-50 shrink-0" />
          </Button>
          <Button variant="outline" onClick={onEditList} className="rounded-2xl h-11 w-11 sm:w-auto touch-target p-0 sm:px-4">
            <Pencil className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Rediger</span>
          </Button>
          <Button variant={compactView ? "secondary" : "ghost"} onClick={toggleCompactView} className="rounded-2xl h-11 w-11 touch-target p-0 shrink-0" title={compactView ? "Full visning" : "Kompakt visning"}>
            {compactView ? <LayoutList className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          {allItemsInCart && (
            <Button onClick={handleCompleteList} className="bg-primary hover:bg-primary/90 rounded-2xl h-11 touch-target hidden sm:flex">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Fullfør
            </Button>
          )}
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
        <div className={`${compactView ? 'space-y-1' : 'space-y-4 md:space-y-6'} max-w-2xl mx-auto pb-32 md:pb-6`}>
          {groupedItems.map((group) => (
            <div key={group.category} className={compactView ? 'space-y-0.5' : 'space-y-3'}>
              {/* Category header */}
              <div className={`flex items-center gap-2 px-1 sticky top-0 bg-background/95 backdrop-blur-sm z-5 ${compactView ? 'py-1.5' : 'py-2'}`}>
                <span className={compactView ? 'text-base' : 'text-lg'}>{group.emoji}</span>
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

                // Check for DIY alternative
                const diyAlternative = !dismissedDiyItems.has(item.id) && !item.in_cart 
                  ? findDiyAlternative(item.name) 
                  : null;

                if (compactView) {
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all touch-target ${
                        item.in_cart 
                          ? 'bg-primary/5 opacity-60' 
                          : 'bg-card border border-border'
                      }`}
                    >
                      <Checkbox
                        checked={item.in_cart}
                        onCheckedChange={() => handleToggleCart(item.id, item.in_cart)}
                        className="h-6 w-6 rounded-md touch-target flex-shrink-0"
                        disabled={isItemLoading}
                      />
                      {selectedProduct ? (
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/product/${selectedProduct.ean}?listId=${listId}&storeId=${storeId}&itemId=${item.id}`)}
                        >
                          <div className="bg-white rounded-lg border border-border p-0.5 flex-shrink-0">
                            <img
                              src={selectedProduct.image || '/placeholder.svg'}
                              alt={selectedProduct.name}
                              className="w-10 h-10 object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${item.in_cart ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {item.quantity > 1 && <span className="text-muted-foreground mr-1">{item.quantity}×</span>}
                              {selectedProduct.brand} {selectedProduct.name}
                            </p>
                          </div>
                          <span className={`text-sm font-semibold flex-shrink-0 ${item.in_cart ? 'text-muted-foreground' : 'text-primary'}`}>
                            {selectedProduct.price !== null ? `${selectedProduct.price.toFixed(0)} kr` : ''}
                          </span>
                        </div>
                      ) : isItemLoading ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                          <Skeleton className="h-4 flex-1" />
                        </div>
                      ) : (
                        <span className={`text-sm flex-1 truncate ${item.in_cart ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.quantity > 1 && <span className="text-muted-foreground mr-1">{item.quantity}×</span>}
                          {item.name}
                        </span>
                      )}
                    </div>
                  );
                }

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
                          onClick={() => navigate(`/product/${selectedProduct.ean}?listId=${listId}&storeId=${storeId}&itemId=${item.id}`)}
                          data-has-ingredients={String(selectedProduct.hasIngredients)}
                          data-nova-score={String(selectedProduct.novaScore)}
                          data-nova-estimated={String(selectedProduct.novaIsEstimated)}
                          className={`${
                            selectedProduct.matchInfo.allergyWarnings.length > 0 
                              ? 'bg-destructive/5 border-destructive/30' 
                              : (selectedProduct.hasIngredients === true && selectedProduct.novaIsEstimated === false && selectedProduct.novaScore !== null && selectedProduct.novaScore <= 2)
                                ? 'bg-primary/5 border-primary/20' 
                                : (selectedProduct.hasIngredients === true && selectedProduct.novaIsEstimated === false && selectedProduct.novaScore !== null && selectedProduct.novaScore >= 3)
                                  ? 'bg-destructive/5 border-destructive/20'
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
                              <p className="font-semibold text-foreground mb-1 truncate">
                                {(() => { const c = getCountryFromEAN(selectedProduct.ean); return c ? <CountryFlag alpha2={c.alpha2} name={c.name} size="sm" className="mr-1" /> : null; })()}
                                {selectedProduct.brand}
                              </p>
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
                                          <p className="text-sm font-semibold truncate">
                                            {(() => { const c = getCountryFromEAN(suggestion.ean); return c ? <CountryFlag alpha2={c.alpha2} name={c.name} size="sm" className="mr-1" /> : null; })()}
                                            {suggestion.brand}
                                          </p>
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

                        {/* DIY Alternative suggestion */}
                        {diyAlternative && (
                          <div 
                            onClick={() => handleShowDiyAlternative(item.id, item.name, diyAlternative)}
                            className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 p-3 rounded-xl cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full flex-shrink-0">
                                <ChefHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">Lag selv: {diyAlternative.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {diyAlternative.ingredients.length} ingredienser • Erstatter {item.name.toLowerCase()}
                                </p>
                              </div>
                              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full text-xs flex-shrink-0">
                                DIY
                              </Badge>
                            </div>
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
                  <Button
                    onClick={handleCompleteList}
                    size="lg"
                    className={`h-12 md:h-14 px-4 md:px-8 text-sm md:text-base rounded-2xl touch-target flex-shrink-0 ${
                      allItemsInCart 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30'
                    }`}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    <span className="hidden sm:inline">Fullfør handleliste</span>
                    <span className="sm:hidden">Fullfør</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <StoreSelectorDialog
        open={showStoreDialog}
        onOpenChange={setShowStoreDialog}
        onSelectStore={onChangeStore}
        currentStoreId={storeId}
      />

      {/* DIY Alternative Dialog */}
      {selectedDiyRecipe && (
        <DiyAlternativeDialog
          open={diyDialogOpen}
          onOpenChange={setDiyDialogOpen}
          recipe={selectedDiyRecipe}
          originalItemName={selectedDiyItemName}
          onAddIngredients={handleAddDiyIngredients}
          onCancel={handleDismissDiy}
        />
      )}
    </div>
  );
};
