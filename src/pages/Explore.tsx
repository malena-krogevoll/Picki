import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useFavoriteProducts } from "@/hooks/useFavoriteProducts";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft, Heart, Plus, Leaf, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface CleanProduct {
  ean: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  nova_class: number;
  chains: string[];
}

const categories = [
  { id: "frukt-gront", emoji: "🍎", name: "Frukt og grønt" },
  { id: "meieri", emoji: "🥛", name: "Meieri" },
  { id: "palegg", emoji: "🧀", name: "Pålegg" },
  { id: "kjott", emoji: "🥩", name: "Kjøtt og ferskvare" },
  { id: "fisk", emoji: "🐟", name: "Fisk og sjømat" },
  { id: "barnemat", emoji: "🍼", name: "Barnemat" },
  { id: "ferdigmat", emoji: "🍽️", name: "Ferdigmat" },
  { id: "hermetikk", emoji: "🥫", name: "Hermetikk" },
  { id: "pasta-ris", emoji: "🍝", name: "Pasta, ris og korn" },
  { id: "sauser-krydder", emoji: "🧂", name: "Sauser og krydder" },
  { id: "drikkevarer", emoji: "🥤", name: "Drikkevarer" },
];

const chainFilters = [
  "REMA 1000", "KIWI", "MENY", "SPAR", "Joker", "Bunnpris",
  "Coop Mega", "Coop Extra", "Coop Prix", "Coop Obs",
];

const Explore = () => {
  const { user, loading: authLoading } = useAuth();
  const { lists, createList } = useShoppingList(user?.id);
  const { isFavorite, toggleFavorite } = useFavoriteProducts(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [products, setProducts] = useState<CleanProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [addToListProduct, setAddToListProduct] = useState<CleanProduct | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchProducts = async (category?: string, search?: string, chain?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      if (chain) params.set("chain", chain);
      params.set("limit", "40");

      const { data, error } = await supabase.functions.invoke("browse-clean-products", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      // Use fetch directly since functions.invoke doesn't support GET params well
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || anonKey;

      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/browse-clean-products?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
          },
        }
      );

      if (!resp.ok) throw new Error("Failed to fetch");
      const result = await resp.json();
      setProducts(result.products || []);
    } catch (err) {
      console.error("Error fetching clean products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory || searchQuery.length >= 2) {
      const timeout = setTimeout(() => {
        fetchProducts(selectedCategory || undefined, searchQuery || undefined, selectedChain || undefined);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setProducts([]);
    }
  }, [selectedCategory, searchQuery, selectedChain]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const handleToggleFavorite = async (product: CleanProduct) => {
    const result = await toggleFavorite({
      ean: product.ean,
      productName: product.name,
      brand: product.brand || undefined,
      imageUrl: product.image_url || undefined,
    });
    if (result.success) {
      toast({
        title: result.action === "added" ? "Lagt til som favoritt ❤️" : "Fjernet fra favoritter",
      });
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!addToListProduct || !user?.id) return;

    // We need to add the item. Use supabase directly.
    const { error } = await supabase.from("shopping_list_items").insert({
      list_id: listId,
      name: addToListProduct.name,
      quantity: 1,
      selected_product_ean: addToListProduct.ean,
      product_data: {
        name: addToListProduct.name,
        brand: addToListProduct.brand,
        image_url: addToListProduct.image_url,
        ean: addToListProduct.ean,
      },
    });

    if (!error) {
      toast({ title: "Lagt til i handlelisten ✓" });
    }
    setAddToListProduct(null);
  };

  const handleCreateAndAdd = async () => {
    if (!addToListProduct) return;
    const defaultName = format(new Date(), "d. MMMM yyyy", { locale: nb });
    const result = await createList(defaultName);
    if (result?.data) {
      await handleAddToList(result.data.id);
    }
  };

  const activeLists = lists.filter((l) => l.status === "active");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-4xl">
        <div className="space-y-4 md:space-y-6">
          {/* Back + Title */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Leaf className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Utforsk renvarer
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Produkter med NOVA 1-2 – minimalt bearbeidet
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk etter renvarer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Chain filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
            {chainFilters.map((chain) => (
              <Badge
                key={chain}
                variant={selectedChain === chain ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap flex-shrink-0 text-xs"
                onClick={() => setSelectedChain(selectedChain === chain ? null : chain)}
              >
                {chain}
              </Badge>
            ))}
          </div>

          {/* Categories grid */}
          {!selectedCategory && searchQuery.length < 2 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="cursor-pointer hover:border-primary/50 transition-all border-2"
                  onClick={() => handleCategoryClick(cat.id)}
                >
                  <CardContent className="flex flex-col items-center justify-center py-4 px-2">
                    <span className="text-2xl md:text-3xl mb-1">{cat.emoji}</span>
                    <span className="text-xs md:text-sm font-medium text-center leading-tight">
                      {cat.name}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Active category chip */}
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <Badge
                variant="default"
                className="cursor-pointer text-sm"
                onClick={() => setSelectedCategory(null)}
              >
                {categories.find((c) => c.id === selectedCategory)?.emoji}{" "}
                {categories.find((c) => c.id === selectedCategory)?.name} ✕
              </Badge>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Products list */}
          {!loading && products.length > 0 && (
            <div className="grid gap-3">
              {products.map((product) => (
                <Card key={product.ean} className="border">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-secondary/30 flex-shrink-0 overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Leaf className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm md:text-base truncate">
                              {product.name}
                            </p>
                            {product.brand && (
                              <p className="text-xs text-muted-foreground truncate">
                                {product.brand}
                              </p>
                            )}
                          </div>
                          <Badge
                            className="flex-shrink-0 bg-green-100 text-green-800 border-green-200 text-xs"
                          >
                            NOVA {product.nova_class}
                          </Badge>
                        </div>

                        {/* Chain badges */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {product.chains.slice(0, 4).map((chain) => (
                            <Badge
                              key={chain}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {chain}
                            </Badge>
                          ))}
                          {product.chains.length > 4 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              +{product.chains.length - 4}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setAddToListProduct(product)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Legg til
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleToggleFavorite(product)}
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${
                                isFavorite(product.ean)
                                  ? "fill-red-500 text-red-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => navigate(`/product/${product.ean}`)}
                          >
                            Detaljer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && products.length === 0 && (selectedCategory || searchQuery.length >= 2) && (
            <div className="text-center py-8">
              <Leaf className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Ingen renvarer funnet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prøv et annet søk eller en annen kategori
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Add to list dialog */}
      <AlertDialog open={!!addToListProduct} onOpenChange={(open) => !open && setAddToListProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Legg til i handleliste</AlertDialogTitle>
            <AlertDialogDescription>
              Velg hvilken handleliste du vil legge «{addToListProduct?.name}» i.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {activeLists.map((list) => (
              <Button
                key={list.id}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => handleAddToList(list.id)}
              >
                <ShoppingCart className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{list.name}</span>
              </Button>
            ))}
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleCreateAndAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ny handleliste
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Explore;
