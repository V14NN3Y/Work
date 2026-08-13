"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PromoCodeFormDialog from "@/components/admin/PromoCodeFormDialog";
import { adminDeletePromoCode, adminListPromoCodes, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/formatCurrency";
import type { PromoCode } from "@/types";

function formatDiscount(promo: PromoCode): string {
  return promo.discount_type === "percentage" ? `${promo.discount_value}%` : formatFCFA(promo.discount_value);
}

export default function AdminPromoCodesPage() {
  const [supabase] = useState(() => createClient());
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoPendingDelete, setPromoPendingDelete] = useState<PromoCode | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListPromoCodes(supabase);
      setPromoCodes(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les codes promo");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirmDelete() {
    const promo = promoPendingDelete;
    if (!promo) return;
    setPromoPendingDelete(null);
    try {
      await adminDeletePromoCode(supabase, promo.id);
      toast.success("Code promo supprimé");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de supprimer le code promo");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Codes promo</h1>
        <PromoCodeFormDialog
          onSaved={load}
          trigger={
            <Button type="button" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau code
            </Button>
          }
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Réduction</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="font-mono font-medium">{promo.code}</TableCell>
                  <TableCell>{formatDiscount(promo)}</TableCell>
                  <TableCell>
                    {promo.usage_count}
                    {promo.usage_limit ? ` / ${promo.usage_limit}` : ""}
                  </TableCell>
                  <TableCell>
                    {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        promo.is_active
                          ? "border-transparent bg-status-completed-bg text-status-completed"
                          : "border-transparent bg-status-cancelled-bg text-status-cancelled"
                      }
                    >
                      {promo.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <PromoCodeFormDialog
                      promoCode={promo}
                      onSaved={load}
                      trigger={
                        <Button type="button" variant="ghost" size="icon" aria-label="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPromoPendingDelete(promo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {promoCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucun code promo pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={promoPendingDelete !== null} onOpenChange={(open) => !open && setPromoPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce code promo ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {promoPendingDelete?.code} » sera définitivement supprimé. Si ce code a déjà été utilisé, la
              suppression sera refusée — désactivez-le à la place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
