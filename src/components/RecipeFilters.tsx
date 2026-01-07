import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, Zap } from "lucide-react";

interface RecipeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  categories: string[];
  showOnlyCompatible: boolean;
  onCompatibleChange: (show: boolean) => void;
  hasPreferences: boolean;
  showOnlyQuick?: boolean;
  onQuickChange?: (show: boolean) => void;
  activeTab?: string;
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
  showOnlyQuick = false,
  onQuickChange,
  activeTab,
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

      <div className="flex flex-wrap items-center gap-2">
        {activeTab === "dinner" && onQuickChange && (
          <Button
            variant={showOnlyQuick ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickChange(!showOnlyQuick)}
            className={`gap-2 ${showOnlyQuick ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
          >
            <Zap className="h-4 w-4" />
            {showOnlyQuick ? "Kun raske" : "Kun raske (< 30 min)"}
          </Button>
        )}

        {hasPreferences && (
          <Button
            variant={showOnlyCompatible ? "default" : "outline"}
            size="sm"
            onClick={() => onCompatibleChange(!showOnlyCompatible)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showOnlyCompatible ? "Viser kun egnede" : "Vis kun egnet for meg"}
          </Button>
        )}

        {(showOnlyCompatible || showOnlyQuick) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCompatibleChange(false);
              onQuickChange?.(false);
            }}
          >
            <X className="h-4 w-4" />
            Fjern filtre
          </Button>
        )}
      </div>
    </div>
  );
};
