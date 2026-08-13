"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import { getProduct } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "@/context/FavoritesContext";
import type { Product } from "@/types";

export default function FavoritesPage() {
  const { favoriteIds } = useFavorites();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const supabase = createClient();
    favoriteIds.forEach((id) => {
      getProduct(supabase, id)
        .then((product) => setProducts((prev) => ({ ...prev, [id]: product })))
        .catch(() => {
          // A favorited product that no longer resolves (deleted/deactivated) simply
          // never appears — no error state needed for a silently-stale favorite.
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteIds.join(",")]);

  const resolved = favoriteIds.map((id) => products[id]).filter((p): p is Product => Boolean(p));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Mes favoris</h1>
        <p className="text-muted-foreground">Les produits que vous avez mis de côté sur cet appareil.</p>
      </div>

      {hydrated && favoriteIds.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Heart className="h-10 w-10" />
          <p>Aucun favori pour l&apos;instant. Touchez le cœur sur une fiche produit pour l&apos;ajouter ici.</p>
        </div>
      )}

      {resolved.length > 0 && <ProductGrid products={resolved} />}
    </div>
  );
}
