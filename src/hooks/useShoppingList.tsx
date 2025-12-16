import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ShoppingListItem {
  id: string;
  list_id: string;
  name: string;
  selected_product_ean: string | null;
  in_cart: boolean;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  status: string;
  store_id: string | null;
  created_at: string;
  completed_at?: string | null;
  items?: ShoppingListItem[];
}

export const useShoppingList = (userId: string | undefined) => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [completedLists, setCompletedLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchLists();
      fetchCompletedLists();
    }
  }, [userId]);

  const fetchLists = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("shopping_lists")
      .select(`
        *,
        items:shopping_list_items(*)
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Feil ved henting av lister",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Sort items by created_at to maintain consistent order
      const sortedData = data?.map(list => ({
        ...list,
        items: list.items?.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })) || [];

      setLists(sortedData);
      if (sortedData && sortedData.length > 0 && !activeList) {
        setActiveList(sortedData[0]);
      }
    }
    setLoading(false);
  };

  const fetchCompletedLists = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("shopping_lists")
      .select(`
        *,
        items:shopping_list_items(*)
      `)
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching completed lists:", error);
    } else {
      setCompletedLists(data || []);
    }
  };

  const createList = async (name: string = "Min handleliste") => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (error) {
      toast({
        title: "Feil ved oppretting av liste",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    await fetchLists();
    setActiveList(data);
    return { data, error: null };
  };

  const addItem = async (listId: string, name: string) => {
    const { error } = await supabase
      .from("shopping_list_items")
      .insert({ list_id: listId, name });

    if (error) {
      toast({
        title: "Feil ved tillegg av vare",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    await fetchLists();
    return { error: null };
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Feil ved sletting av vare",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    await fetchLists();
    return { error: null };
  };

  const updateItemStatus = async (itemId: string, inCart: boolean) => {
    // Optimistically update local state immediately for instant UI feedback
    setLists(prevLists =>
      prevLists.map(list => ({
        ...list,
        items: list.items?.map(item =>
          item.id === itemId ? { ...item, in_cart: inCart } : item
        )
      }))
    );

    // Update active list as well
    if (activeList?.items) {
      setActiveList({
        ...activeList,
        items: activeList.items.map(item =>
          item.id === itemId ? { ...item, in_cart: inCart } : item
        )
      });
    }

    // Update database in the background
    const { error } = await supabase
      .from("shopping_list_items")
      .update({ in_cart: inCart })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Feil ved oppdatering av status",
        description: error.message,
        variant: "destructive",
      });
      // Revert optimistic update on error
      await fetchLists();
      return { error };
    }

    return { error: null };
  };

  const completeList = async (listId: string) => {
    const { error } = await supabase
      .from("shopping_lists")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", listId);

    if (error) {
      toast({
        title: "Feil ved fullføring av liste",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Liste fullført!",
      description: "Handlelisten er arkivert.",
    });

    await fetchLists();
    setActiveList(null);
    return { error: null };
  };

  const updateListStore = async (listId: string, storeId: string) => {
    const { error } = await supabase
      .from("shopping_lists")
      .update({ store_id: storeId })
      .eq("id", listId);

    if (error) {
      toast({
        title: "Feil ved oppdatering av butikk",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    await fetchLists();
    return { error: null };
  };

  const duplicateList = async (listId: string) => {
    if (!userId) return { error: { message: "Ingen bruker" } };

    // Hent listen som skal dupliseres
    const { data: originalList, error: fetchError } = await supabase
      .from("shopping_lists")
      .select(`
        *,
        items:shopping_list_items(*)
      `)
      .eq("id", listId)
      .single();

    if (fetchError || !originalList) {
      toast({
        title: "Feil ved henting av liste",
        description: fetchError?.message,
        variant: "destructive",
      });
      return { error: fetchError };
    }

    // Opprett ny liste
    const { data: newList, error: createError } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: userId,
        name: `${originalList.name} (kopi)`,
        status: "active",
      })
      .select()
      .single();

    if (createError || !newList) {
      toast({
        title: "Feil ved oppretting av liste",
        description: createError?.message,
        variant: "destructive",
      });
      return { error: createError };
    }

    // Kopier alle varer
    if (originalList.items && originalList.items.length > 0) {
      const itemsToInsert = originalList.items.map((item: ShoppingListItem) => ({
        list_id: newList.id,
        name: item.name,
        in_cart: false,
      }));

      const { error: itemsError } = await supabase
        .from("shopping_list_items")
        .insert(itemsToInsert);

      if (itemsError) {
        toast({
          title: "Feil ved kopiering av varer",
          description: itemsError.message,
          variant: "destructive",
        });
        return { error: itemsError };
      }
    }

    toast({
      title: "Liste duplisert!",
      description: "Den nye listen er klar til bruk.",
    });

    await fetchLists();
    setActiveList(newList);
    return { data: newList, error: null };
  };

  const deleteList = async (listId: string) => {
    if (!userId) return { error: { message: "Ingen bruker" } };

    const { error } = await supabase
      .from("shopping_lists")
      .delete()
      .eq("id", listId)
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Feil ved sletting av liste",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Liste slettet",
      description: "Handlelisten er permanent fjernet.",
    });

    await fetchLists();
    await fetchCompletedLists();

    if (activeList?.id === listId) {
      setActiveList(null);
    }

    return { error: null };
  };

  return {
    lists,
    completedLists,
    activeList,
    loading,
    createList,
    addItem,
    removeItem,
    updateItemStatus,
    completeList,
    updateListStore,
    duplicateList,
    deleteList,
    setActiveList,
    refetch: fetchLists,
  };
};
