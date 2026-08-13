import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient, publicStorageUrl } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

const BUCKET = "product-images";

// Mirrors backend/app/services/image_storage.py::save_product_image exactly (force-convert,
// shrink-only resize to a 1600px box, WebP quality 80, random filename) — with one bonus over
// the original: rotate() applies the EXIF orientation before resizing instead of ignoring it.
async function processImage(file: File): Promise<Buffer> {
  const bytes = await file.arrayBuffer();
  return sharp(Buffer.from(bytes))
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ detail: "Aucun fichier fourni" }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("product_images")
    .select("display_order")
    .eq("product_id", params.id)
    .order("display_order", { ascending: false })
    .limit(1);
  let nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const inserted = [];
  for (const file of files) {
    const webp = await processImage(file);
    const path = `${params.id}/${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, webp, { contentType: "image/webp" });
    if (uploadError) {
      return NextResponse.json({ detail: `Échec de l'upload: ${uploadError.message}` }, { status: 500 });
    }

    const { data: row, error: insertError } = await admin
      .from("product_images")
      .insert({ product_id: params.id, image_url: publicStorageUrl(BUCKET, path), display_order: nextOrder })
      .select()
      .single();
    if (insertError) {
      return NextResponse.json({ detail: `Échec de l'enregistrement: ${insertError.message}` }, { status: 500 });
    }

    inserted.push(row);
    nextOrder += 1;
  }

  return NextResponse.json(inserted);
}
