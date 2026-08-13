"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminCreatePromoCode, adminUpdatePromoCode, ApiError, type PromoCodePayload } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { DiscountType, PromoCode } from "@/types";

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm"; API dates are full ISO strings.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

interface PromoCodeFormDialogProps {
  promoCode?: PromoCode;
  trigger: ReactNode;
  onSaved: () => void;
}

export default function PromoCodeFormDialog({ promoCode, trigger, onSaved }: PromoCodeFormDialogProps) {
  const [supabase] = useState(() => createClient());
  const isEdit = Boolean(promoCode);
  const [open, setOpen] = useState(false);

  const [code, setCode] = useState(promoCode?.code ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(promoCode?.discount_type ?? "percentage");
  const [discountValue, setDiscountValue] = useState(promoCode?.discount_value ?? "");
  const [minOrderAmount, setMinOrderAmount] = useState(promoCode?.min_order_amount ?? "");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(promoCode?.max_discount_amount ?? "");
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(promoCode?.expires_at ?? null));
  const [usageLimit, setUsageLimit] = useState(promoCode?.usage_limit?.toString() ?? "");
  const [isActive, setIsActive] = useState(promoCode?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload: PromoCodePayload = {
      code,
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount || null,
      max_discount_amount: maxDiscountAmount || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      is_active: isActive,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && promoCode) {
        await adminUpdatePromoCode(supabase, promoCode.id, payload);
      } else {
        await adminCreatePromoCode(supabase, payload);
      }
      toast.success(isEdit ? "Code promo mis à jour" : "Code promo créé");
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Modifier le code promo" : "Nouveau code promo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-type">Type de réduction</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                <SelectTrigger id="discount-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-value">{discountType === "percentage" ? "Valeur (%)" : "Valeur (FCFA)"}</Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-order">Commande min. (FCFA)</Label>
              <Input
                id="min-order"
                type="number"
                min="0"
                step="0.01"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="Aucun minimum"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-discount">Réduction max. (FCFA)</Label>
              <Input
                id="max-discount"
                type="number"
                min="0"
                step="0.01"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="Aucun plafond"
                disabled={discountType === "fixed"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expires-at">Expire le</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage-limit">Limite d&apos;utilisation</Label>
              <Input
                id="usage-limit"
                type="number"
                min="1"
                step="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Illimitée"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
            Code actif
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
