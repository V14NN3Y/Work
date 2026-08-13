"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminCreateCategory, adminUpdateCategory, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

interface CategoryFormDialogProps {
  category?: Category;
  trigger: ReactNode;
  onSaved: () => void;
}

export default function CategoryFormDialog({ category, trigger, onSaved }: CategoryFormDialogProps) {
  const isEdit = Boolean(category);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      if (isEdit && category) {
        await adminUpdateCategory(supabase, category.id, name);
      } else {
        await adminCreateCategory(supabase, name);
      }
      toast.success(isEdit ? "Catégorie mise à jour" : "Catégorie créée");
      setOpen(false);
      setName(isEdit ? name : "");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nom</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
