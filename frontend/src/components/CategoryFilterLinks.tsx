import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryFilterLinksProps {
  categories: Category[];
  activeCategoryId?: string;
}

export default function CategoryFilterLinks({ categories, activeCategoryId }: CategoryFilterLinksProps) {
  if (categories.length === 0) return null;

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filtrer par catégorie">
      <Link
        href="/"
        className={cn(
          "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
          !activeCategoryId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        Toutes les catégories
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/?category=${category.id}`}
          className={cn(
            "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
            activeCategoryId === category.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
