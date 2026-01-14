import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Sparkles, AlertCircle, ShoppingBasket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

interface ProductData {
  ean: string;
  name: string;
  brand: string;
  price: number | null;
  image: string;
  novaScore: number | null;
  store: string;
}

interface ProductSuggestion {
  ean: string;
  name: string;
  brand: string;
  price: number | null;
  image: string;
  novaScore: number | null;
  store: string;
  score: number;
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

        const products: ProductSuggestion[] = (data?.results || [])
          .slice(0, 8)
          .map((r: any) => ({
            ean: r.product?.EAN?.toString() || '',
            name: r.product?.Produktnavn || '',
            brand: r.product?.Merke || '',
            price: r.product?.Pris ? parseFloat(r.product.Pris) : null,
            image: r.product?.Produktbilde_URL || '',
            novaScore: null, // Will be fetched later if needed
            store: r.product?.StoreCode || storeId,
            score: r.score || 0,
          }));

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
  }, [query, storeId, profile?.preferences]);

  const handleSelectProduct = (product: ProductSuggestion) => {
    const productData: ProductData = {
      ean: product.ean,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      novaScore: product.novaScore,
      store: product.store,
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
    if (score <= 2) return "bg-primary text-primary-foreground";
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
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                  onClick={() => handleSelectProduct(product)}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="h-12 w-12 object-contain rounded-lg bg-white border border-border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <ShoppingBasket className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.brand && <span>{product.brand}</span>}
                      {product.price && (
                        <span className="font-semibold text-foreground">
                          {product.price.toFixed(2)} kr
                        </span>
                      )}
                    </div>
                  </div>
                  {product.novaScore !== null && (
                    <Badge className={`${getNovaColor(product.novaScore)} text-xs px-2`}>
                      NOVA {product.novaScore}
                    </Badge>
                  )}
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
