import { z } from "zod";

// Format générique multi-pays (zone FCFA) : chiffres uniquement après nettoyage des espaces/tirets.
export const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

export const checkoutSchema = z.object({
  customerName: z.string().min(1, "Le nom complet est requis").max(150),
  phoneNumber: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => PHONE_REGEX.test(v), "Numéro de téléphone invalide"),
  addressText: z.string().min(1, "L'adresse indicative est requise").max(255),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const trackOrderSchema = z.object({
  orderRef: z.string().min(1, "La référence de commande est requise").max(20),
  phoneNumber: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => PHONE_REGEX.test(v), "Numéro de téléphone invalide"),
});

export type TrackOrderFormValues = z.infer<typeof trackOrderSchema>;

export const reviewSchema = z.object({
  orderRef: z.string().min(1, "La référence de commande est requise").max(20),
  phoneNumber: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => PHONE_REGEX.test(v), "Numéro de téléphone invalide"),
  rating: z.number().min(1, "Choisissez une note").max(5),
  comment: z.string().max(2000).optional(),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
