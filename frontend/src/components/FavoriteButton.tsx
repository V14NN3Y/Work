"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  stopPropagation?: boolean;
}

export default function FavoriteButton({ productId, className, stopPropagation }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(productId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={favorite}
      className={cn("bg-background/80 hover:bg-background", className)}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        toggleFavorite(productId);
      }}
    >
      <Heart className={cn("h-4 w-4", favorite ? "fill-destructive text-destructive" : "text-foreground")} />
    </Button>
  );
}
