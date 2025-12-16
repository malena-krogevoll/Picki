import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { parseShoppingListText, formatParsedItem, ParsedItem } from '@/lib/textParser';
import { FileText, Plus, X } from 'lucide-react';

interface Props {
  onListCreated: () => void;
}

const TextInputShoppingList = ({ onListCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Vennligst skriv inn et navn på handlelista"
      });
      return;
    }

    if (parsedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Feil", 
        description: "Ingen varer funnet. Skriv inn varer i tekstfeltet."
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Du må være logget inn"
      });
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

      // Add items to the list - format item name with quantity if > 1
      const itemsToInsert = parsedItems.map(item => ({
        list_id: listData.id,
        name: item.quantity > 1 
          ? `${item.quantity}x ${item.product_name}${item.notes ? ` (${item.notes})` : ''}`
          : `${item.product_name}${item.notes ? ` (${item.notes})` : ''}`
      }));

      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Suksess",
        description: `Handleliste "${listName}" opprettet med ${parsedItems.length} varer!`
      });

      // Reset form
      setTextInput('');
      setListName('');
      setParsedItems([]);
      onListCreated();

    } catch (error) {
      console.error('Error creating shopping list:', error);
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke opprette handleliste"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Opprett handleliste fra tekst
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="list-name-text">Navn på handleliste</Label>
          <Input
            id="list-name-text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="F.eks. Ukeshandel, Middag i kveld..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-input">Skriv inn handleliste</Label>
          <Textarea
            id="text-input"
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Eksempel:
melk, brød, 2 bananer
3x epler, 1 liter yoghurt
ost (norvegia), 500g kjøttdeig"
            rows={6}
          />
          <p className="text-sm text-muted-foreground">
            Skriv varer adskilt med komma eller på nye linjer. Du kan inkludere antall (f.eks. "2 bananer", "3x epler").
          </p>
        </div>

        {parsedItems.length > 0 && (
          <div className="space-y-2">
            <Label>Funnet varer ({parsedItems.length})</Label>
            <div className="flex flex-wrap gap-2">
              {parsedItems.map((item, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                    className="w-8 bg-transparent border-0 text-xs text-center"
                  />
                  {item.product_name}
                  {item.notes && <span className="text-xs opacity-70">({item.notes})</span>}
                  <button
                    onClick={() => removeItem(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
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
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {loading ? 'Oppretter...' : `Opprett liste med ${parsedItems.length} varer`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TextInputShoppingList;
