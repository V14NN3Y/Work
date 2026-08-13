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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CategoryFormDialog from "@/components/admin/CategoryFormDialog";
import { adminDeleteCategory, adminListCategories, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  const [supabase] = useState(() => createClient());
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListCategories(supabase);
      setCategories(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les catégories");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirmDelete() {
    const category = categoryPendingDelete;
    if (!category) return;
    setCategoryPendingDelete(null);
    try {
      await adminDeleteCategory(supabase, category.id);
      toast.success("Catégorie supprimée");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de supprimer la catégorie");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Catégories</h1>
        <CategoryFormDialog
          onSaved={load}
          trigger={
            <Button type="button" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle catégorie
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
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <CategoryFormDialog
                      category={category}
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
                      onClick={() => setCategoryPendingDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    Aucune catégorie pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={categoryPendingDelete !== null}
        onOpenChange={(open) => !open && setCategoryPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {categoryPendingDelete?.name} » sera supprimée. Les produits qui y sont rattachés deviendront
              « Sans catégorie » — ils ne seront pas supprimés.
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
