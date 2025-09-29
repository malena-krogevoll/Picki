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
  product_name: string;
  quantity: number;
  is_completed: boolean;
  notes: string | null;
  ean: number | null;
}

interface ShoppingList {
  id: string;
  name: string;
  store_code: string | null;
  store_name: string | null;
  created_at: string;
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
      .eq('shopping_list_id', listId)
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
        shopping_list_id: listId,
        product_name: newItemName.trim(),
        quantity: 1
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

  const toggleItemCompleted = async (itemId: string, completed: boolean) => {
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ is_completed: completed })
      .eq('id', itemId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Kunne ikke oppdatere element"
      });
    } else {
      setItems(items.map(item => 
        item.id === itemId ? { ...item, is_completed: completed } : item
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

  const completedItems = items.filter(item => item.is_completed);
  const pendingItems = items.filter(item => !item.is_completed);

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
              {list.store_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Store className="h-4 w-4" />
                  {list.store_name}
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
                    checked={item.is_completed}
                    onCheckedChange={(checked) => toggleItemCompleted(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{item.product_name}</span>
                    {item.quantity > 1 && (
                      <span className="text-sm text-muted-foreground ml-2">({item.quantity} stk)</span>
                    )}
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                    )}
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
                Fullført ({completedItems.length} elementer)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded opacity-60">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={(checked) => toggleItemCompleted(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium line-through">{item.product_name}</span>
                    {item.quantity > 1 && (
                      <span className="text-sm text-muted-foreground ml-2">({item.quantity} stk)</span>
                    )}
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