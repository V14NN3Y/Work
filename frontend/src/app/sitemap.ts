import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/api";
import { createStaticClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cart`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/suivi-commande`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/cgv`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.1 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { items } = await getProducts(createStaticClient(), { page: 1 });
    productRoutes = items.map((product) => ({
      url: `${SITE_URL}/product/${product.id}`,
      lastModified: product.created_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // Supabase unreachable at build time — ship the static routes only rather than failing the build.
  }

  return [...staticRoutes, ...productRoutes];
}
