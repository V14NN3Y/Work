import { Star } from "lucide-react";
import ReviewForm from "@/components/ReviewForm";
import { Button } from "@/components/ui/button";
import { getProductReviews } from "@/lib/api";
import { createStaticClient } from "@/lib/supabase/server";
import type { Review } from "@/types";

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} sur 5 étoiles`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= Math.round(value) ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4 text-muted-foreground"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  return (
    <li className="space-y-1 border-b border-border py-4 last:border-0">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{review.customer_name}</span>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <StarRating value={review.rating} />
      {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
    </li>
  );
}

export default async function ProductReviews({ productId }: { productId: string }) {
  const { items, total, average_rating } = await getProductReviews(createStaticClient(), productId);

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">Avis clients</h2>
          {average_rating !== null ? (
            <div className="mt-1 flex items-center gap-2">
              <StarRating value={average_rating} />
              <span className="text-sm text-muted-foreground">
                {average_rating.toFixed(1)} / 5 ({total} avis)
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Aucun avis pour l&apos;instant.</p>
          )}
        </div>
        <ReviewForm productId={productId} trigger={<Button variant="outline">Laisser un avis</Button>} />
      </div>

      {items.length > 0 && (
        <ul className="divide-y-0">
          {items.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </div>
  );
}
