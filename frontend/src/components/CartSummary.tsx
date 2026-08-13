"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromoCodeInput from "@/components/PromoCodeInput";
import QuantitySelector from "@/components/QuantitySelector";
import { useCart } from "@/context/CartContext";
import { formatFCFA } from "@/lib/formatCurrency";

export default function CartSummary() {
  const { items, updateQuantity, removeItem, totalAmount, discountAmount, finalAmount } = useCart();

  if (items.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Votre panier est vide.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 py-4">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{formatFCFA(item.price)}</p>
            </div>
            <QuantitySelector
              value={item.quantity}
              max={item.stockQuantity}
              onChange={(q) => updateQuantity(item.productId, q)}
            />
            <p className="w-24 flex-shrink-0 text-right font-medium">
              {formatFCFA(parseFloat(item.price) * item.quantity)}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Supprimer l'article"
              className="flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(item.productId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <PromoCodeInput />

      <div className="space-y-1 border-t border-border pt-4">
        {discountAmount > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Sous-total</span>
              <span>{formatFCFA(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-status-completed">
              <span>Réduction</span>
              <span>-{formatFCFA(discountAmount)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total</span>
          <span className="font-heading text-lg font-bold text-primary">{formatFCFA(finalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
