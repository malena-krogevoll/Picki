import { useState, useRef, ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableCardProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
}

export const SwipeableCard = ({ children, onDelete, className = "" }: SwipeableCardProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const deleteThreshold = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Only allow swiping left
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX < deleteThreshold) {
      // Show delete button
      setTranslateX(-80);
    } else {
      // Reset position
      setTranslateX(0);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const resetSwipe = () => {
    setTranslateX(0);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Delete button background */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive px-6"
        style={{ width: "80px" }}
      >
        <button
          onClick={handleDelete}
          className="touch-target flex items-center justify-center text-destructive-foreground"
        >
          <Trash2 className="h-6 w-6" />
        </button>
      </div>

      {/* Card content */}
      <div
        className="relative bg-background transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateX(${translateX}px)`,
          transitionDuration: isDragging ? "0ms" : "200ms"
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => translateX !== 0 && resetSwipe()}
      >
        {children}
      </div>
    </div>
  );
};
