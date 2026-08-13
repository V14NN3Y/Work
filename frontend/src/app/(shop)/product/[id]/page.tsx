import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductReviews from "@/components/ProductReviews";
import { ApiError, getProduct } from "@/lib/api";
import { createStaticClient } from "@/lib/supabase/server";

// Was missing entirely before — the page was statically rendered once and never refreshed,
// so admin edits (price, stock, images) never appeared here without a full server restart.
// Matches the homepage's revalidate window.
export const revalidate = 60;

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const product = await getProduct(createStaticClient(), params.id);
    const image = product.image_url ?? product.images[0]?.image_url ?? undefined;
    return {
      title: product.title,
      description: product.description ?? undefined,
      openGraph: {
        title: product.title,
        description: product.description ?? undefined,
        images: image ? [{ url: image }] : undefined,
        type: "website",
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  let product;
  try {
    product = await getProduct(createStaticClient(), params.id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const image = product.image_url ?? product.images[0]?.image_url ?? undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: image ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "XOF",
      price: product.price,
      availability:
        product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="space-y-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} fallbackUrl={product.image_url} title={product.title} />
        <div className="space-y-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">{product.title}</h1>
          <ProductPurchasePanel product={product} />
          {product.description && (
            <div className="prose prose-neutral max-w-none border-t border-border pt-4 prose-headings:font-heading">
              <ReactMarkdown>{product.description}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
      <ProductReviews productId={product.id} />
    </div>
  );
}
