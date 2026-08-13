"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminCreateProduct, adminListCategories, adminUpdateProduct, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types";

const NO_CATEGORY = "none";

interface ProductFormProps {
  product?: Product;
  onSaved?: () => void;
}

export default function ProductForm({ product, onSaved }: ProductFormProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const isEdit = Boolean(product);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity ?? 0);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? NO_CATEGORY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminListCategories(supabase)
      .then((data) => setCategories(data.items))
      .catch(() => {
        // Non-blocking: the form still works without the category selector populated.
      });
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && product) {
        await adminUpdateProduct(supabase, product.id, {
          title,
          description,
          price,
          stock_quantity: stockQuantity,
          is_active: isActive,
          category_id: categoryId === NO_CATEGORY ? null : categoryId,
        });
        onSaved?.();
      } else {
        const created = await adminCreateProduct(supabase, {
          title,
          description,
          price,
          stock_quantity: stockQuantity,
          image_url: "",
          category_id: categoryId === NO_CATEGORY ? null : categoryId,
        });
        router.push(`/admin/products/${created.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nom du produit</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              className="min-h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (FCFA)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Quantité en stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Sans catégorie</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              Produit actif (visible sur la boutique)
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer le produit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
