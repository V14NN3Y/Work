"use client";

import CartSummary from "@/components/CartSummary";
import CheckoutForm from "@/components/CheckoutForm";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items } = useCart();

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">Votre panier</h1>
      <CartSummary />
      {items.length > 0 && (
        <div className="border-t border-border pt-6">
          <h2 className="mb-4 font-heading text-xl font-semibold">Finaliser la commande</h2>
          <CheckoutForm />
        </div>
      )}
    </div>
  );
}
