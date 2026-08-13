import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
}

function totalPagesOf({ pageSize, total }: PaginationInfo): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Server-renderable, zero client JS — for pages driven by `searchParams`. */
export function PaginationLinks({ page, pageSize, total, basePath }: PaginationInfo & { basePath: string }) {
  const totalPages = totalPagesOf({ page, pageSize, total });
  if (totalPages <= 1) return null;

  const separator = basePath.includes("?") ? "&" : "?";
  const hrefFor = (p: number) => (p === 1 ? basePath : `${basePath}${separator}page=${p}`);

  return (
    <nav className="flex items-center justify-center gap-4 pt-4" aria-label="Pagination">
      <Button asChild variant="outline" className="gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Link>
        ) : (
          <span className="pointer-events-none opacity-40">
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} / {totalPages}
      </span>
      <Button asChild variant="outline" className="gap-1">
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)}>
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="pointer-events-none opacity-40">
            Suivant
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}

/** Client-driven — for admin lists that hold `page` in local state. */
export function PaginationButtons({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationInfo & { onPageChange: (page: number) => void }) {
  const totalPages = totalPagesOf({ page, pageSize, total });
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-4 pt-4" aria-label="Pagination">
      <Button
        type="button"
        variant="outline"
        className="gap-1"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Précédent
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} / {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        className="gap-1"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
