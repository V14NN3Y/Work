"use client";

import Link from "next/link";
import { Heart, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";

export default function SiteHeader() {
  const { itemCount } = useCart();
  const { favoriteIds } = useFavorites();

  return (
    <header className="sticky top-0 z-10 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold">
          ORALYAH
        </Link>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/suivi-commande">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Mes commandes</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="relative border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/favoris">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Favoris</span>
              {favoriteIds.length > 0 && (
                <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-cta px-1.5 text-xs font-bold text-cta-foreground">
                  {favoriteIds.length}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" className="relative border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/cart">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Panier</span>
              {itemCount > 0 && (
                <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-cta px-1.5 text-xs font-bold text-cta-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
