"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="font-heading text-xl font-bold text-foreground">Une erreur est survenue</h1>
      <p className="text-muted-foreground">
        Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      <div className="flex gap-3">
        <Button type="button" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
