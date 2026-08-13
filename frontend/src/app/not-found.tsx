import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="font-heading text-xl font-bold text-foreground">Page introuvable</h1>
      <p className="text-muted-foreground">La page que vous cherchez n&apos;existe pas ou plus.</p>
      <Button type="button" asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
