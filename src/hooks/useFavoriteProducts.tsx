import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FavoriteProduct {
  id: string;
  user_id: string;
  ean: string;
  product_name: string;
  brand: string | null;
  image_url: string | null;
  search_terms: string[];
  created_at: string;
}

/** Derive search terms from a product name + optional list context */
export function deriveSearchTerms(productName: string, listItemName?: string): string[] {
  const stopWords = new Set([
    'og', 'med', 'i', 'fra', 'av', 'den', 'det', 'de', 'en', 'et', 'til',
    'for', 'på', 'er', 'som', 'var', 'har', 'kan', 'vil', 'skal', 'alle',
    'g', 'kg', 'ml', 'cl', 'dl', 'l', 'stk', 'pk', 'pr', 'ca',
  ]);

  const sizePattern = /\b\d+\s*(g|kg|ml|cl|dl|l|stk|pk|x)\b/gi;

  const tokenize = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(sizePattern, '')
      .split(/[\s,./\-–—()]+/)
      .map(t => t.trim())
      .filter(t => t.length > 1 && !stopWords.has(t) && !/^\d+$/.test(t));

  const terms = new Set<string>();
  tokenize(productName).forEach(t => terms.add(t));
  if (listItemName) {
    tokenize(listItemName).forEach(t => terms.add(t));
  }
  return Array.from(terms);
}

export const useFavoriteProducts = (userId: string | undefined) => {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all favorites on mount
  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('user_favorite_products')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching favorite products:', error);
      } else {
        setFavorites((data as unknown as FavoriteProduct[]) || []);
      }
      setLoading(false);
    };

    fetchFavorites();
  }, [userId]);

  const isFavorite = useCallback(
    (ean: string) => favorites.some(f => f.ean === ean),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (params: {
      ean: string;
      productName: string;
      brand?: string;
      imageUrl?: string;
      listItemName?: string;
    }) => {
      if (!userId) return;

      const existing = favorites.find(f => f.ean === params.ean);
      if (existing) {
        // Remove
        const { error } = await supabase
          .from('user_favorite_products')
          .delete()
          .eq('id', existing.id);
        if (!error) {
          setFavorites(prev => prev.filter(f => f.id !== existing.id));
        }
        return !error;
      } else {
        // Add
        const searchTerms = deriveSearchTerms(params.productName, params.listItemName);
        const { data, error } = await supabase
          .from('user_favorite_products')
          .insert({
            user_id: userId,
            ean: params.ean,
            product_name: params.productName,
            brand: params.brand || null,
            image_url: params.imageUrl || null,
            search_terms: searchTerms,
          })
          .select()
          .single();

        if (!error && data) {
          setFavorites(prev => [...prev, data as unknown as FavoriteProduct]);
        }
        return !error;
      }
    },
    [userId, favorites]
  );

  /** Find a favorite that matches a shopping list item name */
  const getFavoriteForQuery = useCallback(
    (query: string): FavoriteProduct | null => {
      if (!query || favorites.length === 0) return null;
      const queryLower = query.toLowerCase().trim();
      const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 1);

      // Score each favorite by how many of its search_terms overlap with the query
      let bestMatch: FavoriteProduct | null = null;
      let bestScore = 0;

      for (const fav of favorites) {
        let score = 0;
        for (const term of fav.search_terms) {
          if (queryLower.includes(term) || term.includes(queryLower)) {
            score += 2; // Strong match
          } else if (queryTokens.some(qt => term.includes(qt) || qt.includes(term))) {
            score += 1; // Partial token match
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = fav;
        }
      }

      // Require minimum score of 2 to avoid false positives
      return bestScore >= 2 ? bestMatch : null;
    },
    [favorites]
  );

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    getFavoriteForQuery,
  };
};
