import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { parseShoppingListText, formatParsedItem, ParsedItem } from '@/lib/textParser';
import { FileText, Plus, X } from 'lucide-react';

interface Props {
  onListCreated: () => void;
}

const TextInputShoppingList = ({ onListCreated }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [textInput, setTextInput] = useState('');
  const [listName, setListName] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleTextChange = (text: string) => {
    setTextInput(text);
    const items = parseShoppingListText(text);
    setParsedItems(items);
  };

  const removeItem = (index: number) => {
    const newItems = parsedItems.filter((_, i) => i !== index);
    setParsedItems(newItems);
    
    // Update text input to reflect removed item
    const newText = newItems.map(formatParsedItem).join(', ');
    setTextInput(newText);
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const newItems = [...parsedItems];
    newItems[index].quantity = Math.max(1, newQuantity);
    setParsedItems(newItems);
    
    // Update text input
    const newText = newItems.map(formatParsedItem).join(', ');
    setTextInput(newText);
  };

  const createListWithItems = async () => {
    if (!listName.trim()) {
      toast.error("Vennligst skriv inn et navn på handlelista");
      return;
    }

    if (parsedItems.length === 0) {
      toast.error("Ingen varer funnet. Skriv inn varer i tekstfeltet.");
      return;
    }

    if (!user) {
      toast.error("Du må være logget inn");
      return;
    }

    setLoading(true);
    
    try {
      // Create the shopping list
      const { data: listData, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          name: listName.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (listError) throw listError;

      // Add items to the list - store name, quantity, and notes separately
      const itemsToInsert = parsedItems.map(item => ({
        list_id: listData.id,
        name: item.product_name,
        quantity: item.quantity,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(`Handleliste "${listName}" opprettet med ${parsedItems.length} varer!`);

      // Reset form
      setTextInput('');
      setListName('');
      setParsedItems([]);
      onListCreated();

      // Navigate to the list editor
      navigate(`/list/${listData.id}`);

    } catch (error) {
      console.error('Error creating shopping list:', error);
      toast.error("Kunne ikke opprette handleliste");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Ny handleliste
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="list-name-text" className="text-sm">Navn på liste</Label>
          <Input
            id="list-name-text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="F.eks. Ukeshandel, Middag..."
            className="rounded-xl bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-input" className="text-sm">Varer</Label>
          <Textarea
            id="text-input"
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Skriv varene dine her...

Eksempel:
melk, brød, 2 bananer
3x epler, ost, kjøttdeig"
            rows={4}
            className="rounded-xl bg-background resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Skriv varer adskilt med komma eller nye linjer
          </p>
        </div>

        {parsedItems.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Gjenkjente varer ({parsedItems.length})</Label>
            <div className="flex flex-wrap gap-2">
              {parsedItems.map((item, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-background border"
                >
                  {item.quantity > 1 && (
                    <span className="text-xs font-semibold text-primary">{item.quantity}x</span>
                  )}
                  <span>{item.product_name}</span>
                  {item.notes && <span className="text-xs opacity-60">({item.notes})</span>}
                  <button
                    onClick={() => removeItem(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={createListWithItems} 
          disabled={loading || parsedItems.length === 0 || !listName.trim()} 
          className="w-full rounded-xl h-12"
        >
          <Plus className="h-4 w-4 mr-2" />
          {loading ? 'Oppretter...' : `Opprett liste med ${parsedItems.length} varer`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TextInputShoppingList;
