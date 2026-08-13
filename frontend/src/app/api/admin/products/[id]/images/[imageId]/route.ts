import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

const BUCKET = "product-images";

// The schema only stores the public URL (matching the old system exactly), so the Storage
// object path is derived from it rather than kept in a separate column.
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export async function DELETE(_request: Request, { params }: { params: { id: string; imageId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const { data: image, error: fetchError } = await admin
    .from("product_images")
    .select("image_url")
    .eq("id", params.imageId)
    .eq("product_id", params.id)
    .single();

  if (fetchError || !image) {
    return NextResponse.json({ detail: "Image introuvable" }, { status: 404 });
  }

  const path = storagePathFromPublicUrl(image.image_url);
  if (path) {
    await admin.storage.from(BUCKET).remove([path]);
  }

  const { error: deleteError } = await admin.from("product_images").delete().eq("id", params.imageId);
  if (deleteError) {
    return NextResponse.json({ detail: deleteError.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
