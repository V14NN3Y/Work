import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

// NOTE développeur : trame informative basée sur le cadre légal béninois de protection des
// données personnelles (Code du numérique, loi n°2017-20 du 20/04/2018, livre 5), sous le
// contrôle de l'APDP. Ne constitue pas un conseil juridique — à faire relire par un avocat
// local avant publication. Les emplacements [À COMPLÉTER] doivent être renseignés.

export default function PolitiqueConfidentialitePage() {
  return (
    <article className="prose prose-neutral max-w-none prose-headings:font-heading">
      <h1>Politique de confidentialité</h1>
      <p>Dernière mise à jour : [À COMPLÉTER]</p>

      <h2>1. Responsable du traitement</h2>
      <p>
        [À COMPLÉTER — raison sociale, adresse, contact] est responsable du traitement des
        données personnelles collectées via ce site.
      </p>

      <h2>2. Données collectées</h2>
      <p>Lors de l&apos;utilisation du site, les données suivantes peuvent être collectées :</p>
      <ul>
        <li>Nom complet, numéro de téléphone et adresse indicative, saisis lors d&apos;une commande ;</li>
        <li>
          <strong>Position GPS précise</strong> (latitude/longitude), transmise via
          l&apos;autorisation de géolocalisation de votre navigateur, uniquement au moment de la
          validation d&apos;une commande, dans le but exclusif d&apos;organiser la livraison ;
        </li>
        <li>Historique des commandes passées (produits, montants, statut) ;</li>
        <li>
          Contenu du panier, conservé localement dans le navigateur (localStorage) tant que la
          commande n&apos;est pas validée.
        </li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <p>Ces données sont utilisées exclusivement pour :</p>
      <ul>
        <li>Traiter et livrer les commandes passées sur le site ;</li>
        <li>Contacter le client si nécessaire concernant sa commande ;</li>
        <li>Assurer le suivi et la gestion du service après-vente.</li>
      </ul>
      <p>Aucune donnée n&apos;est utilisée à des fins de prospection commerciale sans consentement préalable.</p>

      <h2>4. Base légale et déclaration APDP</h2>
      <p>
        Ce traitement est réalisé conformément au Code du numérique béninois (loi n°2017-20 du 20
        avril 2018) relatif à la protection des données à caractère personnel. Conformément à
        cette loi, ce traitement fait l&apos;objet d&apos;une déclaration auprès de
        l&apos;Autorité de Protection des Données Personnelles (APDP) du Bénin.
        <br />
        Numéro de récépissé de déclaration APDP : [À COMPLÉTER]
      </p>

      <h2>5. Durée de conservation</h2>
      <p>
        Les données relatives aux commandes sont conservées [À COMPLÉTER — durée, ex. la durée
        nécessaire à la gestion commerciale et comptable, conformément aux obligations légales
        applicables].
      </p>

      <h2>6. Partage des données</h2>
      <p>
        Les données de localisation et de contact peuvent être partagées avec le personnel chargé
        de la livraison, dans la seule mesure nécessaire à l&apos;exécution de la commande. Elles
        ne sont ni vendues, ni cédées à des tiers à des fins commerciales.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Conformément à la réglementation applicable, vous disposez d&apos;un droit
        d&apos;accès, de rectification, d&apos;opposition et de suppression des données vous
        concernant. Vous pouvez exercer ces droits en nous contactant : [À COMPLÉTER — email/téléphone].
        Vous disposez également du droit d&apos;introduire une réclamation auprès de
        l&apos;APDP.
      </p>

      <h2>8. Cookies et stockage local</h2>
      <p>
        Le site utilise le stockage local du navigateur (localStorage) pour conserver le contenu
        du panier d&apos;achat et, côté administration, la session de connexion. Aucun cookie de
        suivi publicitaire ou de mesure d&apos;audience tiers n&apos;est utilisé à ce jour.
      </p>
    </article>
  );
}
