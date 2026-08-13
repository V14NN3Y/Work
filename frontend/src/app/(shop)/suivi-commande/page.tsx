"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import OrderStatusCard from "@/components/OrderStatusCard";
import { ApiError, trackOrder } from "@/lib/api";
import { forgetOrder, getRememberedOrders, rememberOrder, type RememberedOrder } from "@/lib/orderHistory";
import { createClient } from "@/lib/supabase/client";
import { trackOrderSchema, type TrackOrderFormValues } from "@/lib/validators";
import type { Order } from "@/types";

interface OrderTrackingPageProps {
  searchParams: { ref?: string };
}

export default function OrderTrackingPage({ searchParams }: OrderTrackingPageProps) {
  const [supabase] = useState(() => createClient());
  const [remembered, setRemembered] = useState<RememberedOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [loadingRefs, setLoadingRefs] = useState<Set<string>>(new Set());

  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TrackOrderFormValues>({
    resolver: zodResolver(trackOrderSchema),
    defaultValues: { orderRef: searchParams.ref ?? "", phoneNumber: "" },
  });

  async function fetchOrder(ref: string, phone: string) {
    setLoadingRefs((prev) => new Set(prev).add(ref));
    try {
      const result = await trackOrder(supabase, ref, phone);
      setOrders((prev) => ({ ...prev, [ref]: result }));
    } catch {
      // A remembered order that no longer resolves (e.g. cleared test data) just stays
      // absent from `orders` — its card silently doesn't render rather than erroring.
    } finally {
      setLoadingRefs((prev) => {
        const next = new Set(prev);
        next.delete(ref);
        return next;
      });
    }
  }

  useEffect(() => {
    const stored = getRememberedOrders();
    setRemembered(stored);
    setHydrated(true);
    stored.forEach((o) => fetchOrder(o.ref, o.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: TrackOrderFormValues) {
    setSubmitting(true);
    setNotFound(false);
    try {
      const result = await trackOrder(supabase, values.orderRef, values.phoneNumber);
      setOrders((prev) => ({ ...prev, [result.order_ref]: result }));
      setRemembered(rememberOrder(result.order_ref, values.phoneNumber));
      form.reset({ orderRef: "", phoneNumber: "" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleForget(ref: string) {
    setRemembered(forgetOrder(ref));
    setOrders((prev) => {
      const next = { ...prev };
      delete next[ref];
      return next;
    });
  }

  const hasRemembered = hydrated && remembered.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Mes commandes</h1>
        <p className="text-muted-foreground">
          {hasRemembered
            ? "Vos commandes passées sur cet appareil, avec leur statut à jour."
            : "Entrez votre référence de commande et votre numéro de téléphone pour connaître son statut."}
        </p>
      </div>

      {hasRemembered && (
        <div className="space-y-4">
          {remembered.map((r) =>
            orders[r.ref] ? (
              <OrderStatusCard key={r.ref} order={orders[r.ref]} onForget={() => handleForget(r.ref)} />
            ) : loadingRefs.has(r.ref) ? (
              <p key={r.ref} className="text-sm text-muted-foreground">
                Chargement de la commande {r.ref}…
              </p>
            ) : null
          )}
        </div>
      )}

      <div className="space-y-4">
        {hasRemembered && (
          <h2 className="font-heading text-lg font-semibold text-foreground">Retrouver une autre commande</h2>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orderRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence de commande</FormLabel>
                  <FormControl>
                    <Input placeholder="CMD260808XXXXXX" {...field} />
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
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <Search className="h-4 w-4" />
              {submitting ? "Recherche…" : "Rechercher ma commande"}
            </Button>
          </form>
        </Form>

        {notFound && (
          <p className="text-sm text-destructive">
            Aucune commande trouvée avec ces informations. Vérifiez la référence et le numéro de téléphone.
          </p>
        )}

        {!hasRemembered && hydrated && (
          <p className="text-xs text-muted-foreground">
            Vos prochaines commandes apparaîtront automatiquement ici, sur cet appareil.
          </p>
        )}
      </div>
    </div>
  );
}
