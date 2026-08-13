"use client";

import { Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS, type ReviewAdmin, type ReviewStatus } from "@/types";

const STATUS_OPTIONS: ReviewStatus[] = ["pending", "approved", "rejected"];

interface ReviewsTableProps {
  reviews: ReviewAdmin[];
  onStatusChange: (reviewId: string, status: ReviewStatus) => void;
  onDelete: (review: ReviewAdmin) => void;
}

export default function ReviewsTable({ reviews, onStatusChange, onDelete }: ReviewsTableProps) {
  if (reviews.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Aucun avis pour ce filtre.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Commentaire</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id} className="align-top">
              <TableCell className="font-medium">{review.product_title}</TableCell>
              <TableCell>{review.customer_name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5" aria-label={`${review.rating} sur 5 étoiles`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "h-4 w-4",
                        n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </TableCell>
              <TableCell className="max-w-xs whitespace-pre-wrap text-sm text-muted-foreground">
                {review.comment ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {new Date(review.created_at).toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell>
                <Select
                  value={review.status}
                  onValueChange={(value) => onStatusChange(review.id, value as ReviewStatus)}
                >
                  <SelectTrigger
                    className={cn("h-9 w-36 border-transparent font-medium", REVIEW_STATUS_COLORS[review.status])}
                  >
                    <SelectValue>
                      <Badge variant="outline" className={cn("border-transparent", REVIEW_STATUS_COLORS[review.status])}>
                        {REVIEW_STATUS_LABELS[review.status]}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {REVIEW_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(review)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
