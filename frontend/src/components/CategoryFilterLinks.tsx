import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryFilterLinksProps {
  categories: Category[];
  activeCategoryId?: string;
  search?: string;
}

/** Preserves the active search query across category clicks (but resets pagination). */
function hrefFor(categoryId: string | undefined, search: string | undefined) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  if (search) params.set("q", search);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default function CategoryFilterLinks({ categories, activeCategoryId, search }: CategoryFilterLinksProps) {
  if (categories.length === 0) return null;

  const isActive = (categoryId: string | undefined) =>
    categoryId === undefined ? !activeCategoryId : activeCategoryId === categoryId;

  const allCategories = [{ id: undefined, name: "Toutes les catégories" }, ...categories];

  return (
    <>
      {/* Mobile/tablette (< lg) : pastilles horizontales défilantes. */}
      <nav aria-label="Filtrer par catégorie" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {allCategories.map((category) => (
          <Link
            key={category.id ?? "all"}
            href={hrefFor(category.id, search)}
            className={cn(
              "flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isActive(category.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      {/* Desktop (≥ lg) : liste verticale en colonne latérale. */}
      <nav aria-label="Filtrer par catégorie" className="hidden lg:block">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Catégories</h2>
        <ul className="space-y-1">
          {allCategories.map((category) => (
            <li key={category.id ?? "all"}>
              <Link
                href={hrefFor(category.id, search)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(category.id) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                )}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
