export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {year} ORALYAH. Tous droits réservés.</p>
      </div>
      {/*
        Simplifié à la demande du client à une seule ligne de copyright. Le reste (logo,
        liens "Mes commandes"/pages légales) a été retiré volontairement, pas oublié — les
        pages légales restent non professionnelles à afficher tant que leur contenu contient
        des [À COMPLÉTER] (raison sociale, RCCM, IFU, n° APDP...). Réactiver si besoin :

      <Image src="/logo-full.png" alt="ORALYAH" width={140} height={34} className="h-8 w-auto" />
      <nav aria-label="Informations légales">
        <Link href="/suivi-commande">Mes commandes</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgv">CGV</Link>
        <Link href="/politique-de-confidentialite">Politique de confidentialité</Link>
      </nav>
      */}
    </footer>
  );
}
