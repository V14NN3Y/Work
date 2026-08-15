"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminBasePath } from "@/components/admin/AdminBasePathContext";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationButtons } from "@/components/PaginationControls";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { adminDeleteProduct, adminListProducts, adminUpdateProduct, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/formatCurrency";
import type { Product } from "@/types";

export default function AdminProductsPage() {
  const basePath = useAdminBasePath();
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, includeInactive]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListProducts(supabase, {
        includeInactive,
        search: debouncedSearch || undefined,
        page,
      });
      setProducts(data.items);
      setTotal(data.total);
      setPageSize(data.page_size);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  }, [includeInactive, debouncedSearch, page, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleActive(product: Product) {
    try {
      await adminUpdateProduct(supabase, product.id, { is_active: !product.is_active });
      toast.success(product.is_active ? "Produit masqué" : "Produit affiché");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de mettre à jour le produit");
    }
  }

  async function handleConfirmDelete() {
    const product = productPendingDelete;
    if (!product) return;
    setProductPendingDelete(null);
    try {
      await adminDeleteProduct(product.id);
      toast.success("Produit supprimé");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Impossible de supprimer le produit");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Catalogue</h1>
        <Button asChild>
          <Link href={`${basePath}/products/new`}>Nouveau produit</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          className="max-w-xs"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={includeInactive} onCheckedChange={(checked) => setIncludeInactive(checked === true)} />
          Afficher les produits masqués
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell>{formatFCFA(product.price)}</TableCell>
                  <TableCell>
                    {product.stock_quantity === 0 ? (
                      <span className="text-destructive">Rupture</span>
                    ) : (
                      product.stock_quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {product.is_active ? (
                      <span className="text-primary">Actif</span>
                    ) : (
                      <span className="text-muted-foreground">Masqué</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" aria-label="Actions">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`${basePath}/products/${product.id}/edit`} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => handleToggleActive(product)}>
                          {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {product.is_active ? "Masquer" : "Afficher"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => setProductPendingDelete(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun produit trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationButtons page={page} pageSize={pageSize} total={total} onPageChange={setPage} />

      <AlertDialog open={productPendingDelete !== null} onOpenChange={(open) => !open && setProductPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {productPendingDelete?.title} » sera supprimé définitivement. Cette action est irréversible. Si ce
              produit a déjà été commandé, la suppression sera refusée — archivez-le (Masquer) à la place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
