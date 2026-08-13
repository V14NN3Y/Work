import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
};

// NOTE développeur : trame informative basée sur le cadre légal béninois (Code du numérique,
// loi n°2017-20 du 20/04/2018, livre relatif au commerce électronique). Ne constitue pas un
// conseil juridique — à faire relire par un avocat local avant publication. Les emplacements
// [À COMPLÉTER] doivent être renseignés avec les informations réelles de l'entreprise.

export default function CGVPage() {
  return (
    <article className="prose prose-neutral max-w-none prose-headings:font-heading">
      <h1>Conditions Générales de Vente</h1>
      <p>Dernière mise à jour : [À COMPLÉTER]</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits
        réalisées sur ce site entre [À COMPLÉTER — raison sociale] (le « Vendeur ») et toute
        personne effectuant un achat (le « Client »). Toute commande passée sur le site implique
        l&apos;acceptation sans réserve des présentes CGV.
      </p>

      <h2>2. Produits et prix</h2>
      <p>
        Les produits proposés à la vente sont décrits et présentés avec la plus grande exactitude
        possible. Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises le cas
        échéant. Le Vendeur se réserve le droit de modifier ses prix à tout moment, les produits
        étant facturés sur la base du tarif en vigueur au moment de la validation de la commande.
      </p>

      <h2>3. Commande</h2>
      <p>
        Le Client sélectionne les produits de son choix, les ajoute à son panier, puis valide sa
        commande en renseignant son nom complet, son numéro de téléphone, une adresse indicative
        et en partageant sa position GPS via son navigateur — cette position est indispensable
        pour permettre au livreur de localiser précisément le lieu de livraison. Toute commande
        est confirmée par l&apos;attribution d&apos;une référence unique.
      </p>

      <h2>4. Paiement</h2>
      <p>
        Le paiement s&apos;effectue exclusivement en espèces, directement auprès du livreur, au
        moment de la remise du produit (paiement à la livraison). Aucun paiement en ligne
        n&apos;est actuellement proposé sur le site.
      </p>

      <h2>5. Livraison</h2>
      <p>
        La livraison est organisée sur la base de l&apos;adresse indicative et de la position GPS
        transmises par le Client lors de la commande. Le Vendeur ne saurait être tenu responsable
        d&apos;un retard ou d&apos;une impossibilité de livraison résultant d&apos;informations de
        localisation inexactes ou d&apos;une indisponibilité du Client. Zone de livraison :
        [À COMPLÉTER]. Délais indicatifs : [À COMPLÉTER].
      </p>

      <h2>6. Droit de rétractation et retours</h2>
      <p>
        Le Client vérifie la conformité du produit au moment de la livraison, avant de procéder au
        paiement. [À COMPLÉTER — conditions précises de retour/échange en cas de produit
        défectueux ou non conforme, délai applicable].
      </p>

      <h2>7. Réclamations</h2>
      <p>
        Pour toute réclamation relative à une commande, le Client peut contacter le Vendeur :
        [À COMPLÉTER — coordonnées].
      </p>

      <h2>8. Droit applicable</h2>
      <p>Les présentes CGV sont soumises au droit béninois.</p>
    </article>
  );
}
