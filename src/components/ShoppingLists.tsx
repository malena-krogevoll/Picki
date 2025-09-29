import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Store } from 'lucide-react';
import TextInputShoppingList from '@/components/TextInputShoppingList';
import ShoppingListView from '@/components/ShoppingListView';

interface ShoppingList {
  id: string;
  name: string;
  store_code: string | null;
  store_name: string | null;
  created_at: string;
}

interface Store {
  StoreCode: string;
  Kjede: string;
}

const ShoppingLists = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchShoppingLists();
      fetchStores();
    }
  }, [user]);

  const fetchShoppingLists = async () => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke hente handlelister"
      });
    } else {
      setLists(data || []);
    }
  };

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from('Produktdatabase')
      .select('StoreCode, Kjede')
      .not('StoreCode', 'is', null)
      .not('Kjede', 'is', null);

    if (error) {
      console.error('Error fetching stores:', error);
    } else {
      // Remove duplicates
      const uniqueStores = data?.reduce((acc: Store[], current) => {
        const existing = acc.find(item => item.StoreCode === current.StoreCode);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []) || [];
      setStores(uniqueStores);
    }
  };

  if (selectedListId) {
    return (
      <ShoppingListView 
        listId={selectedListId} 
        onBack={() => setSelectedListId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <TextInputShoppingList 
        stores={stores} 
        onListCreated={fetchShoppingLists}
      />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Dine handlelister</h2>
        {lists.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Du har ingen handlelister ennå.</p>
              <p>Opprett din første liste ovenfor!</p>
            </CardContent>
          </Card>
        ) : (
          lists.map((list) => (
            <Card 
              key={list.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedListId(list.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{list.name}</h3>
                    {list.store_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Store className="h-4 w-4" />
                        {list.store_name}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(list.created_at).toLocaleDateString('no-NO')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ShoppingLists;