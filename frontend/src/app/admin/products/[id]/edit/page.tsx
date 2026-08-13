"use client";

import { useCallback, useEffect, useState } from "react";
import ImageGalleryEditor from "@/components/admin/ImageGalleryEditor";
import ProductForm from "@/components/admin/ProductForm";
import { adminGetProduct, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [supabase] = useState(() => createClient());
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminGetProduct(supabase, params.id);
      setProduct(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger le produit");
    }
  }, [params.id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!product) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Modifier « {product.title} »</h1>
      <ProductForm product={product} onSaved={load} />
      <ImageGalleryEditor
        productId={product.id}
        images={product.images}
        hasCover={Boolean(product.image_url)}
        onSaved={load}
      />
    </div>
  );
}
