import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-secondary">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {year} ORALYAH. Tous droits réservés.</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Informations légales">
          <Link href="/suivi-commande" className="hover:text-foreground hover:underline">
            Mes commandes
          </Link>
          <Link href="/mentions-legales" className="hover:text-foreground hover:underline">
            Mentions légales
          </Link>
          <Link href="/cgv" className="hover:text-foreground hover:underline">
            CGV
          </Link>
          <Link href="/politique-de-confidentialite" className="hover:text-foreground hover:underline">
            Politique de confidentialité
          </Link>
        </nav>
      </div>
    </footer>
  );
}
