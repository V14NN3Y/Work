import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

const BUCKET = "product-images";

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// Orchestrates Storage cleanup before the product row delete — this is the one step that can't
// be a plain RLS-gated `supabase.from("products").delete()` from the client, since removing the
// Storage objects has to happen somewhere with the service_role key. The guard_product_delete
// trigger (blocks deletion of an already-ordered product) still fires regardless of this
// Route Handler and is the actual source of truth for that rule.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const { data: images } = await admin.from("product_images").select("image_url").eq("product_id", params.id);
  const paths = (images ?? []).map((img) => storagePathFromPublicUrl(img.image_url)).filter((p): p is string => !!p);
  if (paths.length > 0) {
    await admin.storage.from(BUCKET).remove(paths);
  }

  const { error: deleteError } = await admin.from("products").delete().eq("id", params.id);
  if (deleteError) {
    const isGuarded = deleteError.code === "PT409";
    return NextResponse.json(
      { detail: deleteError.message },
      { status: isGuarded ? 409 : 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
