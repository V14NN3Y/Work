import CategoryFilterLinks from "@/components/CategoryFilterLinks";
import { PaginationLinks } from "@/components/PaginationControls";
import ProductGrid from "@/components/ProductGrid";
import { getCategories, getProducts } from "@/lib/api";
import { createStaticClient } from "@/lib/supabase/server";

export const revalidate = 60;

interface HomePageProps {
  searchParams: { page?: string; category?: string; q?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = Number(searchParams.page) > 0 ? Number(searchParams.page) : 1;
  const categoryId = searchParams.category;
  const search = searchParams.q;
  const supabase = createStaticClient();

  const [{ items, total, page_size }, { items: categories }] = await Promise.all([
    getProducts(supabase, { page, categoryId, search }),
    getCategories(supabase),
  ]);

  const baseParams = new URLSearchParams();
  if (categoryId) baseParams.set("category", categoryId);
  if (search) baseParams.set("q", search);
  const basePathQs = baseParams.toString();
  const basePath = basePathQs ? `/?${basePathQs}` : "/";

  return (
    <div className="space-y-16">
      <div className="rounded-2xl bg-gradient-to-r from-[#FBF3E1] to-[#F3E6C4] px-6 py-8 sm:px-10 sm:py-10">
        <h1 className="font-heading text-2xl font-bold text-primary sm:text-3xl">
          {search ? `Résultats pour « ${search} »` : "Notre catalogue"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Paiement en espèces à la livraison — commandez en quelques clics.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:pt-1">
          <CategoryFilterLinks categories={categories} activeCategoryId={categoryId} search={search} />
        </aside>
        <div className="space-y-6">
          <ProductGrid products={items} />
          <PaginationLinks page={page} pageSize={page_size} total={total} basePath={basePath} />
        </div>
      </div>
    </div>
  );
}
