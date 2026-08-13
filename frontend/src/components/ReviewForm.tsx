"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, createReview } from "@/lib/api";
import { reviewSchema, type ReviewFormValues } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";

interface ReviewFormProps {
  productId: string;
  trigger: ReactNode;
}

export default function ReviewForm({ productId, trigger }: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { orderRef: "", phoneNumber: "", rating: 0, comment: "" },
  });

  const rating = form.watch("rating");

  async function onSubmit(values: ReviewFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      await createReview(supabase, {
        product_id: productId,
        order_ref: values.orderRef,
        phone_number: values.phoneNumber,
        rating: values.rating,
        comment: values.comment || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setSubmitError(null);
          setSubmitted(false);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Laisser un avis</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <p className="text-sm text-foreground">
            Merci ! Votre avis a bien été envoyé et sera visible après modération.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Entrez la référence et le numéro de téléphone de votre commande pour confirmer votre achat.
              </p>

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

              <FormField
                control={form.control}
                name="rating"
                render={() => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <div className="flex gap-1" role="group" aria-label="Note sur 5 étoiles">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={rating === value}
                            aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                            onClick={() => form.setValue("rating", value, { shouldValidate: true })}
                            className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Star
                              className={
                                value <= rating
                                  ? "h-6 w-6 fill-primary text-primary"
                                  : "h-6 w-6 text-muted-foreground"
                              }
                            />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commentaire (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Envoi en cours…" : "Envoyer mon avis"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
