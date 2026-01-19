import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X, Zap, Filter, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters
  const activeFilterCount = [
    selectedCategory !== null,
    showOnlyQuick,
    showOnlyCompatible,
  ].filter(Boolean).length;

  const handleReset = () => {
    onCategoryChange(null);
    onQuickChange?.(false);
    onCompatibleChange(false);
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  return (
    <div className="flex gap-3 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk etter oppskrifter..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Avanserte filtre
            </SheetTitle>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Kategori</Label>
                <div className="space-y-1">
                  <button
                    onClick={() => onCategoryChange(null)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      selectedCategory === null 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>Alle kategorier</span>
                    {selectedCategory === null && <Check className="h-4 w-4" />}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => onCategoryChange(category)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        selectedCategory === category 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      }`}
                    >
                      <span>{category}</span>
                      {selectedCategory === category && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Quick filter - only for dinner */}
            {activeTab === "dinner" && onQuickChange && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="quick-filter" className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Kun raske oppskrifter
                  </Label>
                  <p className="text-xs text-muted-foreground">Under 30 minutter</p>
                </div>
                <Switch
                  id="quick-filter"
                  checked={showOnlyQuick}
                  onCheckedChange={onQuickChange}
                />
              </div>
            )}

            {/* Compatibility filter */}
            {hasPreferences && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compatible-filter" className="text-sm font-medium">
                    Kun egnet for meg
                  </Label>
                  <p className="text-xs text-muted-foreground">Basert på dine preferanser</p>
                </div>
                <Switch
                  id="compatible-filter"
                  checked={showOnlyCompatible}
                  onCheckedChange={onCompatibleChange}
                />
              </div>
            )}
          </div>

          <SheetFooter className="flex-col gap-2 sm:flex-col">
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                onClick={handleReset}
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Nullstill alle filtre
              </Button>
            )}
            <Button onClick={handleApply} className="w-full">
              Bruk filtre
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
