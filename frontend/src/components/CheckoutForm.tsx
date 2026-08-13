"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import GeolocationButton from "@/components/GeolocationButton";
import { useCart } from "@/context/CartContext";
import { ApiError, createOrder } from "@/lib/api";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validators";
import { rememberOrder } from "@/lib/orderHistory";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutForm() {
  const { items, promoCode, clearCart } = useCart();
  const router = useRouter();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", phoneNumber: "", addressText: "" },
  });

  async function onSubmit(values: CheckoutFormValues) {
    if (!coords) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const order = await createOrder(supabase, {
        customer_name: values.customerName,
        phone_number: values.phoneNumber,
        address_text: values.addressText,
        latitude: coords.latitude,
        longitude: coords.longitude,
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        promo_code: promoCode ?? undefined,
      });
      rememberOrder(order.order_ref, values.phoneNumber);
      clearCart();
      router.push(`/order-confirmation?ref=${order.order_ref}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = coords !== null && !submitting && items.length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="addressText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse indicative (ville, quartier)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <GeolocationButton onCaptured={(latitude, longitude) => setCoords({ latitude, longitude })} />

        <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <Banknote className="h-4 w-4 flex-shrink-0" />
          Mode de règlement : <strong className="text-foreground">Paiement en espèces à la livraison</strong>
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" variant="cta" className="w-full" disabled={!canSubmit}>
          {submitting ? "Envoi en cours…" : "Valider la commande"}
        </Button>
      </form>
    </Form>
  );
}
