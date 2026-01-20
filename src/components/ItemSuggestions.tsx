import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ItemSuggestionsProps {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  visible: boolean;
}

export const ItemSuggestions = ({ query, onSelectSuggestion, visible }: ItemSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-items', {
          body: { query: query.trim() }
        });

        if (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } else {
          setSuggestions(data?.suggestions || []);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, visible]);

  if (!visible || query.trim().length < 2) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Henter forslag...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 py-2 px-1">
      <span className="text-xs text-muted-foreground w-full mb-1">Forslag:</span>
      {suggestions.map((suggestion, index) => (
        <Badge
          key={index}
          variant="outline"
          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors capitalize"
          onClick={() => onSelectSuggestion(suggestion)}
        >
          {suggestion}
        </Badge>
      ))}
    </div>
  );
};
