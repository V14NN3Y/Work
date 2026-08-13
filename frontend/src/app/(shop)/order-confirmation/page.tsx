"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function OrderConfirmationPage({ searchParams }: { searchParams: { ref?: string } }) {
  const [copied, setCopied] = useState(false);
  const ref = searchParams.ref;

  async function handleCopy() {
    if (!ref) return;
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      toast.success("Référence copiée !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier automatiquement — notez la référence manuellement.");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
      <h1 className="font-heading text-2xl font-bold text-foreground">Commande confirmée !</h1>
      {ref && (
        <div className="mx-auto flex w-fit items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3">
          <span className="font-mono text-lg font-bold text-foreground">{ref}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Copier la référence de commande"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-status-completed" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
      <p className="text-muted-foreground">
        Notez cette référence — elle vous permettra de suivre votre commande. Elle est aussi mémorisée
        automatiquement dans « Mes commandes » sur cet appareil.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="cta">
          <Link href="/">Retour à la boutique</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ref ? `/suivi-commande?ref=${ref}` : "/suivi-commande"}>Mes commandes</Link>
        </Button>
      </div>
    </div>
  );
}
