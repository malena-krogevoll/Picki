import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, ShoppingBasket, Info, AlertCircle } from "lucide-react";

interface ProductData {
  ean: string;
  name: string;
  brand: string;
  price: number | null;
  image: string;
  novaScore: number | null;
  store: string;
}

interface ShoppingListItemProps {
  id: string;
  name: string;
  inCart: boolean;
  productData: ProductData | null;
  alternatives?: ProductData[];
  onToggleCart: () => void;
  onRemove: () => void;
  onSwapProduct?: (productData: ProductData) => void;
  listId: string;
  storeId: string;
}

export const ShoppingListItem = ({
  id,
  name,
  inCart,
  productData,
  alternatives = [],
  onToggleCart,
  onRemove,
  onSwapProduct,
  listId,
  storeId,
}: ShoppingListItemProps) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // All products (current + alternatives)
  const allProducts = productData ? [productData, ...alternatives] : [];
  const currentProduct = allProducts[currentIndex];
  const hasMultiple = allProducts.length > 1;

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!hasMultiple) return;
    
    let newIndex: number;
    if (direction === 'left') {
      newIndex = (currentIndex + 1) % allProducts.length;
    } else {
      newIndex = (currentIndex - 1 + allProducts.length) % allProducts.length;
    }
    
    setCurrentIndex(newIndex);
    if (onSwapProduct && allProducts[newIndex]) {
      onSwapProduct(allProducts[newIndex]);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) {
      const delta = e.touches[0].clientX - touchStart;
      setTouchDelta(delta);
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 50) {
      handleSwipe(touchDelta > 0 ? 'right' : 'left');
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  const handleProductClick = () => {
    if (currentProduct?.ean) {
      navigate(`/product/${currentProduct.ean}?listId=${listId}&store=${storeId}`);
    }
  };

  const getNovaColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score <= 2) return "bg-primary text-primary-foreground";
    if (score === 3) return "bg-yellow-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  const isFreeText = !productData;

  return (
    <Card
      ref={cardRef}
      className={`relative overflow-hidden transition-all ${
        inCart 
          ? "border-primary/50 bg-primary/5" 
          : "border-border hover:border-primary/30"
      } rounded-2xl`}
      style={{
        transform: touchDelta !== 0 ? `translateX(${touchDelta * 0.3}px)` : undefined,
      }}
      onTouchStart={hasMultiple ? handleTouchStart : undefined}
      onTouchMove={hasMultiple ? handleTouchMove : undefined}
      onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={inCart}
            onCheckedChange={onToggleCart}
            className="mt-1 h-6 w-6 rounded-md flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isFreeText ? (
              // Free text item
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <ShoppingBasket className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className={`font-medium ${inCart ? "line-through text-muted-foreground" : ""}`}>
                    {name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // Product item
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0 -mt-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={handleProductClick}
                >
                  {currentProduct?.image ? (
                    <img
                      src={currentProduct.image}
                      alt={currentProduct.name}
                      className="h-14 w-14 object-contain rounded-lg bg-white border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingBasket className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${inCart ? "line-through text-muted-foreground" : ""}`}>
                      {currentProduct?.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {currentProduct?.brand && <span>{currentProduct.brand}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {currentProduct?.price && (
                        <span className="font-semibold text-sm">
                          {currentProduct.price.toFixed(2)} kr
                        </span>
                      )}
                      {currentProduct?.novaScore !== null && currentProduct?.novaScore !== undefined && (
                        <Badge className={`${getNovaColor(currentProduct.novaScore)} text-xs px-2 py-0`}>
                          NOVA {currentProduct.novaScore}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>

                {/* Swipe indicators */}
                {hasMultiple && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwipe('right')}
                      className="h-8 px-2 text-xs"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Forrige
                    </Button>
                    <div className="flex gap-1">
                      {allProducts.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            idx === currentIndex ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwipe('left')}
                      className="h-8 px-2 text-xs"
                    >
                      Neste
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
