import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, ShoppingCart, Store } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [newListName, setNewListName] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(false);

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

  const createShoppingList = async () => {
    if (!newListName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Vennligst skriv inn et navn på handlelista"
      });
      return;
    }

    setLoading(true);
    
    const selectedStoreData = stores.find(store => store.StoreCode === selectedStore);
    
    const { error } = await supabase
      .from('shopping_lists')
      .insert({
        name: newListName.trim(),
        store_code: selectedStore || null,
        store_name: selectedStoreData?.Kjede || null,
        user_id: user?.id
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke opprette handleliste"
      });
    } else {
      toast({
        title: "Suksess",
        description: "Handleliste opprettet!"
      });
      setNewListName('');
      setSelectedStore('');
      fetchShoppingLists();
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ny handleliste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">Navn på handleliste</Label>
            <Input
              id="list-name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="F.eks. Ukeshandel, Middag i kveld..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="store-select">Velg butikk (valgfritt)</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="Velg butikk" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.StoreCode} value={store.StoreCode}>
                    {store.Kjede}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={createShoppingList} disabled={loading} className="w-full">
            {loading ? 'Oppretter...' : 'Opprett handleliste'}
          </Button>
        </CardContent>
      </Card>

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
            <Card key={list.id} className="cursor-pointer hover:shadow-md transition-shadow">
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