import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
};

// NOTE développeur : ce contenu est une trame informative basée sur le cadre légal béninois
// (Code du numérique, loi n°2017-20 du 20/04/2018) — il ne constitue pas un conseil juridique.
// Les emplacements [À COMPLÉTER] doivent être renseignés avec les informations réelles de
// l'entreprise, et la page doit idéalement être relue par un avocat local avant publication.

export default function MentionsLegalesPage() {
  return (
    <article className="prose prose-neutral max-w-none prose-headings:font-heading">
      <h1>Mentions légales</h1>

      <h2>1. Éditeur du site</h2>
      <p>
        Le présent site est édité par :
        <br />
        Raison sociale : [À COMPLÉTER]
        <br />
        Forme juridique : [À COMPLÉTER]
        <br />
        Numéro RCCM (Registre du Commerce et du Crédit Mobilier) : [À COMPLÉTER]
        <br />
        Identifiant Fiscal Unique (IFU) : [À COMPLÉTER]
        <br />
        Siège social : [À COMPLÉTER — adresse complète, Bénin]
        <br />
        Téléphone : [À COMPLÉTER]
        <br />
        E-mail : [À COMPLÉTER]
        <br />
        Directeur de la publication : [À COMPLÉTER]
      </p>

      <h2>2. Hébergement</h2>
      <p>
        Le site est hébergé par :
        <br />
        [À COMPLÉTER — nom de l&apos;hébergeur, adresse, contact]
      </p>

      <h2>3. Activité</h2>
      <p>
        Le site propose la vente en ligne de produits avec paiement en espèces à la livraison, à
        destination de clients situés au Bénin (et le cas échéant dans la zone desservie par le
        vendeur).
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur ce site (textes, images, logos, structure) est,
        sauf mention contraire, la propriété de l&apos;éditeur ou de ses fournisseurs et est protégé
        par les dispositions applicables en matière de propriété intellectuelle.
      </p>

      <h2>5. Protection des données personnelles</h2>
      <p>
        Le traitement des données personnelles collectées sur ce site (nom, téléphone, adresse,
        position GPS) est décrit dans notre{" "}
        <a href="/politique-de-confidentialite">politique de confidentialité</a>, conforme aux
        exigences du Code du numérique béninois (loi n°2017-20 du 20 avril 2018) relatives à la
        protection des données à caractère personnel, sous le contrôle de l&apos;Autorité de
        Protection des Données Personnelles (APDP).
      </p>
      <p>Numéro de déclaration/récépissé APDP : [À COMPLÉTER]</p>

      <h2>6. Contact</h2>
      <p>Pour toute question relative au site, vous pouvez nous contacter : [À COMPLÉTER]</p>
    </article>
  );
}
