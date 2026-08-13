"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReviewsTable from "@/components/admin/ReviewsTable";
import { PaginationButtons } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDeleteReview, adminListReviews, adminModerateReview, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { REVIEW_STATUS_LABELS, type ReviewAdmin, type ReviewStatus } from "@/types";

const FILTERS: (ReviewStatus | "all")[] = ["all", "pending", "approved", "rejected"];

export default function AdminReviewsPage() {
  const [supabase] = useState(() => createClient());
  const [reviews, setReviews] = useState<ReviewAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewPendingDelete, setReviewPendingDelete] = useState<ReviewAdmin | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListReviews(supabase, { status: filter === "all" ? undefined : filter, page });
      setReviews(data.items);
      setTotal(data.total);
      setPageSize(data.page_size);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les avis");
    } finally {
      setLoading(false);
    }
  }, [filter, page, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(reviewId: string, status: ReviewStatus) {
    try {
      await adminModerateReview(supabase, reviewId, status);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de mettre à jour l'avis");
    }
  }

  async function handleConfirmDelete() {
    const review = reviewPendingDelete;
    if (!review) return;
    setReviewPendingDelete(null);
    try {
      await adminDeleteReview(supabase, review.id);
      toast.success("Avis supprimé");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de supprimer l'avis");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Avis clients</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Tous" : REVIEW_STATUS_LABELS[f]}
            {f === filter && ` (${total})`}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <ReviewsTable reviews={reviews} onStatusChange={handleStatusChange} onDelete={setReviewPendingDelete} />
          <PaginationButtons page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      <AlertDialog open={reviewPendingDelete !== null} onOpenChange={(open) => !open && setReviewPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;avis de « {reviewPendingDelete?.customer_name} » sur « {reviewPendingDelete?.product_title} » sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
