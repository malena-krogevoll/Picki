import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  EAN?: number;
  Produktnavn?: string;
  Pris?: string;
  Kjede?: string;
  StoreCode?: string;
  Kategori?: string;
  'Allergener/Kosthold'?: string;
  Tilleggsfiltre?: string;
  Produktbilde_URL?: string;
  Ingrediensliste?: string;
  Region?: string;
  Tilgjengelighet?: string;
}

export interface ProductCandidate {
  product: Product;
  score: number;
  priceNumeric: number;
  renvareScore: number;
  availability: string;
  matchReason: string;
}

export interface SearchResult {
  query: string;
  results: ProductCandidate[];
  totalFound: number;
  source: string;
}

export interface UserPreferences {
  allergies: string[];
  diets: string[];
  renvare_only: boolean;
  priority_order: string[];
}

export const useProductSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductCandidate[]>([]);
  const { toast } = useToast();

  const searchProducts = async (
    query: string, 
    storeCode?: string, 
    userPreferences?: UserPreferences
  ): Promise<ProductCandidate[]> => {
    if (!query || query.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Søketekst kan ikke være tom"
      });
      return [];
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-products', {
        body: {
          query: query.trim(),
          storeCode,
          userPreferences
        }
      });

      if (error) {
        throw error;
      }

      const searchResult = data as SearchResult;
      setResults(searchResult.results);
      
      toast({
        title: "Søk fullført",
        description: `Fant ${searchResult.results.length} produkter for "${query}"`
      });

      return searchResult.results;
    } catch (error) {
      console.error('Product search failed:', error);
      toast({
        variant: "destructive", 
        title: "Søk feilet",
        description: "Kunne ikke søke etter produkter. Prøv igjen."
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const searchMultipleProducts = async (
    queries: string[],
    storeCode?: string,
    userPreferences?: UserPreferences
  ): Promise<Map<string, ProductCandidate[]>> => {
    const resultMap = new Map<string, ProductCandidate[]>();
    
    setLoading(true);
    try {
      // Search for each query in parallel
      const searchPromises = queries.map(async (query) => {
        if (!query || query.trim().length === 0) return { query, results: [] };
        
        const { data, error } = await supabase.functions.invoke('search-products', {
          body: {
            query: query.trim(),
            storeCode,
            userPreferences
          }
        });

        if (error) {
          console.error(`Search failed for "${query}":`, error);
          return { query, results: [] };
        }

        const searchResult = data as SearchResult;
        return { query, results: searchResult.results };
      });

      const results = await Promise.all(searchPromises);
      
      // Build result map
      for (const { query, results: queryResults } of results) {
        resultMap.set(query, queryResults);
      }

      const totalFound = Array.from(resultMap.values()).reduce(
        (sum, products) => sum + products.length, 
        0
      );

      toast({
        title: "Søk fullført",
        description: `Fant ${totalFound} produkter for ${queries.length} varer`
      });

      return resultMap;
    } catch (error) {
      console.error('Multiple product search failed:', error);
      toast({
        variant: "destructive",
        title: "Søk feilet", 
        description: "Kunne ikke søke etter produkter. Prøv igjen."
      });
      return resultMap;
    } finally {
      setLoading(false);
    }
  };

  return {
    searchProducts,
    searchMultipleProducts,
    loading,
    results
  };
};