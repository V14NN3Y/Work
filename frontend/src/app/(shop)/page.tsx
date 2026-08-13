import CategoryFilterLinks from "@/components/CategoryFilterLinks";
import { PaginationLinks } from "@/components/PaginationControls";
import ProductGrid from "@/components/ProductGrid";
import { getCategories, getProducts } from "@/lib/api";
import { createStaticClient } from "@/lib/supabase/server";

export const revalidate = 60;

interface HomePageProps {
  searchParams: { page?: string; category?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = Number(searchParams.page) > 0 ? Number(searchParams.page) : 1;
  const categoryId = searchParams.category;
  const supabase = createStaticClient();

  const [{ items, total, page_size }, { items: categories }] = await Promise.all([
    getProducts(supabase, { page, categoryId }),
    getCategories(supabase),
  ]);

  const basePath = categoryId ? `/?category=${categoryId}` : "/";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Notre catalogue</h1>
        <p className="text-muted-foreground">Paiement en espèces à la livraison — commandez en quelques clics.</p>
      </div>
      <CategoryFilterLinks categories={categories} activeCategoryId={categoryId} />
      <ProductGrid products={items} />
      <PaginationLinks page={page} pageSize={page_size} total={total} basePath={basePath} />
    </div>
  );
}
