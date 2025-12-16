import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Check, X, Store } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ShoppingListItem {
  id: string;
  name: string;
  in_cart: boolean;
  selected_product_ean: string | null;
  list_id: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ShoppingList {
  id: string;
  name: string;
  store_id: string | null;
  user_id: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

interface ShoppingListViewProps {
  listId: string;
  onBack: () => void;
}

const ShoppingListView = ({ listId, onBack }: ShoppingListViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListAndItems();
  }, [listId]);

  const fetchListAndItems = async () => {
    setLoading(true);
    
    // Fetch list details
    const { data: listData, error: listError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke hente handleliste"
      });
      onBack();
      return;
    }

    // Fetch list items
    const { data: itemsData, error: itemsError } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (itemsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke hente handleliste-elementer"
      });
    } else {
      setItems(itemsData || []);
    }

    setList(listData);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newItemName.trim()) return;

    const { error } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: listId,
        name: newItemName.trim()
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke legge til element"
      });
    } else {
      setNewItemName('');
      fetchListAndItems();
    }
  };

  const toggleItemCompleted = async (itemId: string, inCart: boolean) => {
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ in_cart: inCart })
      .eq('id', itemId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke oppdatere element"
      });
    } else {
      setItems(items.map(item => 
        item.id === itemId ? { ...item, in_cart: inCart } : item
      ));
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke slette element"
      });
    } else {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-lg">Laster handleliste...</p>
        </div>
      </div>
    );
  }

  if (!list) {
    return null;
  }

  const completedItems = items.filter(item => item.in_cart);
  const pendingItems = items.filter(item => !item.in_cart);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{list.name}</h1>
              {list.store_id && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Store className="h-4 w-4" />
                  Butikk: {list.store_id}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Add new item */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Legg til element
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Produktnavn..."
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <Button onClick={addItem} disabled={!newItemName.trim()}>
                Legg til
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Handleliste ({pendingItems.length} elementer)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                  <Checkbox
                    checked={item.in_cart}
                    onCheckedChange={(checked) => toggleItemCompleted(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Completed items */}
        {completedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                I handlekurven ({completedItems.length} elementer)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded opacity-60">
                  <Checkbox
                    checked={item.in_cart}
                    onCheckedChange={(checked) => toggleItemCompleted(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium line-through">{item.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {items.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ingen elementer i handlelista ennå.</p>
              <p>Legg til ditt første element ovenfor!</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ShoppingListView;
