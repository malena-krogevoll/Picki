import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

interface RecipeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  categories: string[];
  showOnlyCompatible: boolean;
  onCompatibleChange: (show: boolean) => void;
  hasPreferences: boolean;
}

export const RecipeFilters = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  showOnlyCompatible,
  onCompatibleChange,
  hasPreferences,
}: RecipeFiltersProps) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk etter oppskrifter..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(null)}
        >
          Alle
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {hasPreferences && (
        <div className="flex items-center gap-2">
          <Button
            variant={showOnlyCompatible ? "default" : "outline"}
            size="sm"
            onClick={() => onCompatibleChange(!showOnlyCompatible)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showOnlyCompatible ? "Viser kun egnede" : "Vis kun egnet for meg"}
          </Button>
          {showOnlyCompatible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCompatibleChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
