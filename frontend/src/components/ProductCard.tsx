"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FavoriteButton from "@/components/FavoriteButton";
import { useCart } from "@/context/CartContext";
import { formatFCFA } from "@/lib/formatCurrency";
import type { Product } from "@/types";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const outOfStock = product.stock_quantity <= 0;
  const cover = product.image_url ?? product.images[0]?.image_url ?? null;

  return (
    <Card className="flex flex-col overflow-hidden rounded-xl border-neutral-200 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-muted">
          {cover ? (
            <Image src={cover} alt={product.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
          {outOfStock && (
            <span className="absolute left-2 top-2 rounded bg-foreground/80 px-2 py-1 text-xs font-medium text-background">
              Rupture de stock
            </span>
          )}
          <FavoriteButton
            productId={product.id}
            stopPropagation
            className="absolute right-2 top-2 h-9 w-9 rounded-full shadow-sm"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/product/${product.id}`} className="line-clamp-2 font-medium text-foreground">
          {product.title}
        </Link>
        <p className="font-heading font-semibold text-primary">{formatFCFA(product.price)}</p>
        <Button
          type="button"
          variant="cta"
          className="mt-auto w-full"
          disabled={outOfStock}
          onClick={() =>
            addItem({
              productId: product.id,
              title: product.title,
              price: product.price,
              imageUrl: cover ?? null,
              stockQuantity: product.stock_quantity,
              quantity: 1,
            })
          }
        >
          {outOfStock ? "Indisponible" : "Ajouter au panier"}
        </Button>
      </div>
    </Card>
  );
}
