"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import FavoriteButton from "@/components/FavoriteButton";
import QuantitySelector from "@/components/QuantitySelector";
import { useCart } from "@/context/CartContext";
import { formatFCFA } from "@/lib/formatCurrency";
import type { Product } from "@/types";

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const outOfStock = product.stock_quantity <= 0;
  const cover = product.image_url ?? product.images[0]?.image_url ?? null;

  function handleAdd() {
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      imageUrl: cover,
      stockQuantity: product.stock_quantity,
      quantity,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading text-2xl font-semibold text-primary">{formatFCFA(product.price)}</p>
        <FavoriteButton productId={product.id} className="border border-border" />
      </div>
      <p className="text-sm text-muted-foreground">
        {outOfStock ? "Rupture de stock" : `${product.stock_quantity} en stock`}
      </p>

      {!outOfStock && (
        <div className="flex items-center gap-4">
          <QuantitySelector value={quantity} max={product.stock_quantity} onChange={setQuantity} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="cta"
          className="flex-1"
          disabled={outOfStock}
          onClick={() => {
            handleAdd();
            router.push("/cart");
          }}
        >
          Acheter maintenant
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={outOfStock} onClick={handleAdd}>
          Ajouter au panier
        </Button>
      </div>
    </div>
  );
}
