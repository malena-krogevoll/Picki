import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FrequentItem {
  name: string;
  count: number;
}

export const useFrequentItems = (userId: string | undefined, currentItems: string[]) => {
  const [allFrequentItems, setAllFrequentItems] = useState<FrequentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchFrequentItems = async () => {
      // Get all items from user's completed and active lists
      const { data, error } = await supabase
        .from("shopping_list_items")
        .select("name, list_id, shopping_lists!inner(user_id)")
        .eq("shopping_lists.user_id", userId);

      if (error) {
        console.error("Error fetching frequent items:", error);
        setLoading(false);
        return;
      }

      // Count frequency of each item name (case-insensitive)
      const frequencyMap = new Map<string, { name: string; count: number }>();
      for (const item of data || []) {
        const key = item.name.toLowerCase().trim();
        const existing = frequencyMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          frequencyMap.set(key, { name: item.name, count: 1 });
        }
      }

      // Sort by frequency descending
      const sorted = Array.from(frequencyMap.values()).sort((a, b) => b.count - a.count);
      setAllFrequentItems(sorted);
      setLoading(false);
    };

    fetchFrequentItems();
  }, [userId]);

  // Filter out items already in the current list
  const suggestions = useMemo(() => {
    const currentSet = new Set(currentItems.map(n => n.toLowerCase().trim()));
    return allFrequentItems.filter(item => !currentSet.has(item.name.toLowerCase().trim()));
  }, [allFrequentItems, currentItems]);

  return { suggestions, loading };
};
