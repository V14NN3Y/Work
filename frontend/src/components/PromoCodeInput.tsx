"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/CartContext";
import { validatePromoCode } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function PromoCodeInput() {
  const { totalAmount, promoCode, applyPromo, clearPromo } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await validatePromoCode(supabase, code.trim(), totalAmount);
      if (result.valid && result.discount_amount) {
        applyPromo(code.trim().toUpperCase(), parseFloat(result.discount_amount));
        setCode("");
      } else {
        setError(result.message ?? "Code promo invalide.");
      }
    } catch {
      setError("Impossible de vérifier ce code, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (promoCode) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
        <span>
          Code <strong className="font-mono">{promoCode}</strong> appliqué
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Retirer le code promo"
          onClick={clearPromo}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code promo"
          aria-label="Code promo"
          className="flex-1"
        />
        <Button type="submit" variant="outline" disabled={submitting || !code.trim()}>
          {submitting ? "Vérification…" : "Appliquer"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
