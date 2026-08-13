"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { ChevronLeft, ChevronRight, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDeleteImage, adminReorderImages, adminUpdateProduct, adminUploadImages, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { ProductImage } from "@/types";

interface ImageGalleryEditorProps {
  productId: string;
  images: ProductImage[];
  hasCover: boolean;
  onSaved: () => void;
}

export default function ImageGalleryEditor({ productId, images, hasCover, onSaved }: ImageGalleryEditorProps) {
  const [supabase] = useState(() => createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      const updatedImages = await adminUploadImages(productId, files);
      if (!hasCover && updatedImages.length > 0) {
        await adminUpdateProduct(supabase, productId, { image_url: updatedImages[0].image_url });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'upload des images");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      await adminDeleteImage(productId, imageId);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la suppression");
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setBusy(true);
    setError(null);
    try {
      await adminReorderImages(
        supabase,
        productId,
        reordered.map((img, idx) => ({ id: img.id, display_order: idx }))
      );
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec du réordonnancement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Galerie d&apos;images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <ul className="grid grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <li key={img.id} className="space-y-1">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <Image src={img.image_url} alt={`Image ${idx + 1} du produit`} fill className="object-cover" />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Déplacer avant"
                    disabled={busy || idx === 0}
                    onClick={() => handleMove(idx, -1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer l'image"
                    className="text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => handleDelete(img.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Déplacer après"
                    disabled={busy || idx === images.length - 1}
                    onClick={() => handleMove(idx, 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div>
          <input
            id="images"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={handleUpload}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Ajouter des images
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
