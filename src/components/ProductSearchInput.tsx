import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Sparkles, ShoppingBasket, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { PreferenceIndicators } from "@/components/PreferenceIndicators";
import { analyzeProductMatch, MatchInfo, UserPreferences } from "@/lib/preferenceAnalysis";

interface ProductData {
  ean: string;
  name: string;
  brand: string;
  price: number | null;
  image: string;
  novaScore: number | null;
  store: string;
  ingredients?: string;
  allergenInfo?: string;
  filters?: string;
}

interface ProductSuggestion {
  ean: string;
  name: string;
  brand: string;
  price: number | null;
  image: string;
  novaScore: number | null;
  isEstimated?: boolean;
  store: string;
  score: number;
  ingredients?: string;
  allergenInfo?: string;
  filters?: string;
  matchInfo?: MatchInfo;
}

interface ProductSearchInputProps {
  storeId: string;
  onAddProduct: (name: string, productData?: ProductData) => void;
  disabled?: boolean;
}

export const ProductSearchInput = ({ storeId, onAddProduct, disabled }: ProductSearchInputProps) => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Convert profile preferences to UserPreferences format
  const userPreferences: UserPreferences | null = useMemo(() => {
    if (!profile?.preferences) return null;
    return {
      allergies: profile.preferences.allergies || [],
      diets: profile.preferences.diets || [],
      other_preferences: {
        organic: profile.preferences.other_preferences?.organic || false,
        lowest_price: profile.preferences.other_preferences?.lowest_price || false,
        animal_welfare: profile.preferences.other_preferences?.animal_welfare || false,
      },
      priority_order: profile.preferences.priority_order || [],
    };
  }, [profile?.preferences]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-products', {
          body: { 
            query: query.trim(), 
            storeId,
            userPreferences: profile?.preferences 
          }
        });

        if (error) throw error;

        // Fetch NOVA scores for the products
        const rawProducts = (data?.results || []).slice(0, 8);
        
        // Batch classify NOVA for all products
        let novaResults: any[] = [];
        try {
          const batchInput = rawProducts.map((r: any) => ({
            ingredients_text: r.product?.Ingrediensliste || '',
            product_category: r.product?.Kategori || '',
          }));
          
          // Call classify-nova batch endpoint directly
          const response = await fetch(
            'https://hoxoaubghdifiprzfcmq.supabase.co/functions/v1/classify-nova/classify-batch',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhveG9hdWJnaGRpZmlwcnpmY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzkxMTUsImV4cCI6MjA4MDc1NTExNX0.ZDK6YAG_r7OH3vNjzj6Nh99rioFUILZgBjMkB3tr1Zk',
              },
              body: JSON.stringify(batchInput),
            }
          );
          
          if (response.ok) {
            novaResults = await response.json();
          }
        } catch (e) {
          console.warn('Failed to fetch NOVA scores:', e);
        }

        const products: ProductSuggestion[] = rawProducts.map((r: any, idx: number) => {
          const productName = r.product?.Produktnavn || '';
          const productBrand = r.product?.Merke || '';
          const ingredients = r.product?.Ingrediensliste || '';
          const allergenInfo = r.product?.["Allergener/Kosthold"] || '';
          
          // Analyze product match with user preferences
          const matchInfo = analyzeProductMatch(
            {
              name: productName,
              brand: productBrand,
              allergener: allergenInfo,
              ingredienser: ingredients,
            },
            userPreferences
          );

          return {
            ean: r.product?.EAN?.toString() || '',
            name: productName,
            brand: productBrand,
            price: r.product?.Pris ? parseFloat(r.product.Pris) : null,
            image: r.product?.Produktbilde_URL || '',
            novaScore: novaResults[idx]?.nova_group ?? null,
            isEstimated: novaResults[idx]?.is_estimated ?? false,
            store: r.product?.StoreCode || storeId,
            score: r.score || 0,
            ingredients,
            allergenInfo,
            filters: r.product?.Tilleggsfiltre || '',
            matchInfo,
          };
        });

        setSuggestions(products);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching products:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, storeId, userPreferences]);

  const handleSelectProduct = (product: ProductSuggestion) => {
    const productData: ProductData = {
      ean: product.ean,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      novaScore: product.novaScore,
      store: product.store,
      ingredients: product.ingredients,
      allergenInfo: product.allergenInfo,
      filters: product.filters,
    };
    onAddProduct(product.name, productData);
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleAddFreeText = () => {
    if (query.trim()) {
      onAddProduct(query.trim());
      setQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const getNovaColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score === 1) return "bg-emerald-500 text-white";
    if (score === 2) return "bg-primary text-primary-foreground";
    if (score === 3) return "bg-yellow-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter vare..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0) {
                  handleSelectProduct(suggestions[0]);
                } else if (query.trim()) {
                  handleAddFreeText();
                }
              }
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            disabled={disabled}
            className="h-12 pl-10 text-base rounded-2xl border-2 border-border focus:border-primary"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
          )}
        </div>
        <Button 
          onClick={handleAddFreeText} 
          size="lg" 
          className="h-12 px-4 rounded-2xl"
          disabled={!query.trim() || disabled}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <Card className="absolute z-50 w-full mt-2 max-h-[400px] overflow-y-auto shadow-lg border-2 border-border rounded-2xl">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2">
              {suggestions.map((product, idx) => (
                <button
                  key={`${product.ean}-${idx}`}
                  className="w-full flex items-start gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                  onClick={() => handleSelectProduct(product)}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="h-12 w-12 object-contain rounded-lg bg-white border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingBasket className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.brand && <span>{product.brand}</span>}
                      {product.price && (
                        <span className="font-semibold text-foreground">
                          {product.price.toFixed(2)} kr
                        </span>
                      )}
                    </div>
                    {/* NOVA Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {product.novaScore !== null && (
                        <Badge className={`${getNovaColor(product.novaScore)} text-[10px] px-1.5 py-0 h-5`}>
                          {product.isEstimated ? (
                            <span className="flex items-center gap-0.5">
                              N{product.novaScore}
                              <HelpCircle className="h-2.5 w-2.5" />
                            </span>
                          ) : (
                            `NOVA ${product.novaScore}`
                          )}
                        </Badge>
                      )}
                      {/* Preference indicators */}
                      {product.matchInfo && (
                        <PreferenceIndicators
                          matchInfo={product.matchInfo}
                          userPreferences={userPreferences}
                          compact
                        />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {/* Add as free text option */}
              {query.trim() && (
                <button
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left border-t border-border"
                  onClick={handleAddFreeText}
                >
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Legg til "{query.trim()}"</p>
                    <p className="text-xs text-muted-foreground">
                      Som fritekst-vare
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Click outside to close */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)} 
        />
      )}
    </div>
  );
};
