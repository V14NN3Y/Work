# Rapport de développement — ORALYAH (E-commerce COD + GPS)

Ce document résume ce qui a été construit, ce qui fonctionne (vérifié réellement, pas
seulement supposé), les limites connues, les pistes d'amélioration, et **comment tester
l'application vous-même**.

Ce rapport a été mis à jour après un **quatrième cycle de travail** : migration complète du
backend vers Supabase, mise en ligne réelle (Netlify + domaine `oralyah.com`), refonte visuelle
autour du vrai logo du client, et sous-domaine admin dédié. Les trois cycles précédents (mise
en place initiale, refonte shadcn/ui, mise à niveau « e-commerce complet » — catégories, avis,
codes promo, SEO, accessibilité) restent résumés en section 1.1 pour mémoire, mais **l'infra
qu'ils décrivaient (FastAPI, Docker Compose, pytest) n'existe plus** — entièrement remplacée
ce cycle-ci.

---

## 1. Ce qui a été fait

### 1.1 Cycles 1-3 (résumé, infra depuis remplacée)

Boutique mobile FCFA, checkout GPS obligatoire, paiement en espèces à la livraison, dashboard
admin. Fonctionnalités livrées et toujours en place aujourd'hui (juste sur une infra
différente) : catalogue avec galerie multi-images, panier persistant, pagination, catégories
et filtres, suivi de commande sans compte client, avis clients avec preuve d'achat et
modération, codes promo avec verrouillage anti-concurrence, pages légales structurées (Bénin),
SEO (sitemap/robots/Open Graph/Schema.org), accessibilité (alt text, lien d'évitement, zones
cliquables ≥ 48px).

### 1.2 Cycle 4 — migration Supabase + mise en ligne réelle + refonte visuelle

| Chantier | Contenu |
|---|---|
| **Backend** | FastAPI + PostgreSQL + Docker Compose entièrement retirés. Remplacés par **Supabase** (Postgres managé + Auth + Storage), logique métier réécrite en fonctions **RPC PL/pgSQL** (`create_order`, `track_order`, `submit_review`, `validate_promo_code`) et en **triggers** pour les invariants qui doivent tenir quel que soit le chemin d'écriture (restock à l'annulation, suppression bloquée sur produit/code promo déjà utilisé, normalisation des codes promo). Sécurité par **Row Level Security** sur chaque table plutôt que par vérifications côté application. |
| **Authentification admin** | JWT + mot de passe haché maison → **Supabase Auth** (email + mot de passe, session par cookie httpOnly, vérifiée côté serveur à chaque requête `/admin/*` par `middleware.ts` via une fonction `is_admin()`). |
| **Déploiement réel** | Frontend sur **Netlify** (build + déploiement automatique à chaque `git push` sur `master`), backend sur un vrai **projet Supabase Cloud**. Nom de domaine **`oralyah.com`** acheté (Namecheap) et connecté (Netlify DNS, HTTPS automatique Let's Encrypt, renouvellement automatique). |
| **Sous-domaine admin** | `adminboard.oralyah.com` — l'administration a sa propre adresse, avec des URLs propres (`/login`, `/orders`, sans préfixe `/admin`). Les anciens liens `oralyah.com/admin/*` redirigent automatiquement vers l'équivalent sur le sous-domaine. Le développement local (`localhost:3001/admin/...`) continue de fonctionner sans changement. |
| **Refonte visuelle** | Nouvelle palette extraite du **vrai logo** du client (vert forêt `#0B4D38`, or `#896829` pour les actions d'achat) — remplace la palette provisoire « Ambre & bleu » du cycle précédent. Contrastes WCAG recalculés et vérifiés pour chaque paire texte/fond (l'or exact du logo, trop clair, a dû être assombri spécifiquement pour les boutons — l'or vif d'origine est réservé aux usages décoratifs). Logo intégré (en-tête, pied de page, favicon — qui n'existait pas avant). |
| **En-tête, recherche, filtres** | En-tête repensé (logo + recherche + icônes), recherche produit fonctionnelle (le paramètre existait déjà côté API, il manquait l'interface), filtres catégories en colonne latérale sur desktop / pastilles horizontales défilantes sur mobile, bannière catalogue. Plusieurs allers-retours de correction responsive (débordement horizontal sur petits écrans, espacement) — voir « bugs trouvés » ci-dessous. |
| **Pied de page simplifié** | Réduit à la seule mention de copyright, à la demande explicite du client. Les liens vers les pages légales sont **masqués** (commentés dans le code, pas supprimés) tant que leur contenu contient des `[À COMPLÉTER]` — jugé pas assez professionnel pour être visible publiquement. Retirées du `sitemap.xml` en cohérence. |
| **Tests** | La suite `pytest` (38 tests) n'existe plus avec le backend FastAPI. Remplacée par : **pgTAP** (`supabase/tests/database/`, 54 assertions — `create_order`, `track_order`, `submit_review`, triggers, RLS complète par rôle) et un **test de concurrence réel en TypeScript** (`supabase/tests/concurrency/promo-race.ts`) qui lance deux requêtes HTTP simultanées contre un code promo à usage limité, répété 50 fois. |
| **Nettoyage** | Tous les fichiers liés à l'ancien déploiement (`docker-compose*.yml`, `Caddyfile`, `Dockerfile*`, anciens guides `DEPLOY.md`/`GUIDE-LANCEMENT.md`) supprimés — plus rien ne les référence, ils décrivaient une infra qui n'existe plus. Conteneurs/images/volumes Docker locaux nettoyés sur la machine de développement. |

**Ce qui n'a volontairement pas été ajouté** (inchangé depuis les cycles précédents) : compte
client, notifications email/SMS, moyens de paiement en ligne.

---

## 2. Ce qui fonctionne bien (vérifié, pas juste écrit)

- **54 assertions pgTAP passent** (`supabase test db`) : décrément de stock et verrouillage
  promo dans `create_order` (y compris l'**atomicité** — un échec sur le second article
  annule bien le décrément déjà fait sur le premier), anti-énumération de `track_order` et
  `submit_review` (messages d'erreur comparés **entre eux**, pas juste contre une chaîne fixe,
  pour prouver qu'ils sont réellement identiques), asymétrie du restock à l'annulation
  (annuler restocke, ré-annuler n'est pas idempotent en double, mais **désannuler ne
  redécrémente jamais** — testé explicitement), suppressions gardées (produit/code promo déjà
  utilisés), RLS testée rôle par rôle (`anon`, `authenticated` non-admin, `authenticated`
  admin) sur chaque table.
- **Test de concurrence réel, 50 itérations** : deux requêtes HTTP indépendantes et
  simultanées contre un code promo à `usage_limit=1` — une seule réussit à chaque fois, sur
  les 50 répétitions (fixtures fraîches et nettoyage à chaque itération). Prouve que le
  verrouillage de ligne PL/pgSQL tient sous charge concurrente réelle, pas seulement en
  théorie.
- **Déploiement en production vérifié directement** (pas juste « ça devrait marcher ») :
  `https://oralyah.com` répond 200 avec le bon contenu, `https://adminboard.oralyah.com/login`
  sert la page de connexion admin sur une URL propre, `https://oralyah.com/admin/orders`
  (ancien lien) redirige bien (307) vers l'équivalent sur le sous-domaine, `sitemap.xml` et
  `robots.txt` référencent le vrai domaine, certificat HTTPS actif et renouvelé
  automatiquement.
- **API REST + RPC testées en direct contre la vraie base de production** (pas seulement en
  local) : lecture publique des produits (RLS appliquée), `validate_promo_code` répond
  correctement, bucket de stockage d'images accessible publiquement.
- **Design vérifié visuellement de façon itérative** par le client directement sur le site
  déployé (pas seulement en local) à chaque étape de la refonte — logo, couleurs, en-tête,
  recherche, filtres, bannière, pied de page.

### Ce qui n'a **pas** été vérifié ce cycle (à faire avant un lancement public)

Contrairement aux cycles précédents où un parcours client/admin complet avait été rejoué en
conditions réelles, **ce cycle-ci n'a pas inclus un parcours de bout en bout complet sur le
nouveau design en production** (créer un vrai produit → le commander → le suivre → laisser un
avis, avec le nouveau visuel). Le backend est vérifié indépendamment (tests + API), le visuel
est vérifié indépendamment (captures d'écran itératives), mais les deux ensemble, en conditions
réelles, sur le site final, restent à confirmer. Voir section 5.

### Bugs réels trouvés et corrigés pendant ce cycle

1. **Le Runtime Next.js de Netlify ne s'activait pas** : un premier déploiement a servi le
   contenu brut du dossier `.next/` comme un site statique (0 fonction serverless générée),
   provoquant un 404 général. Causé par un réglage manuel du "Publish directory" qui empêchait
   Netlify de reconnaître le projet comme Next.js. Corrigé en sélectionnant explicitement le
   "Next.js Runtime" dans les réglages de build.
2. **URL de stockage d'image incorrecte en interne vs public** *(trouvé lors d'un cycle
   antérieur, toujours pertinent)* : déjà documenté, non régressé ce cycle.
3. **Débordement horizontal sur mobile** : l'en-tête (logo + barre de recherche + icônes)
   dépassait la largeur disponible sur les écrans étroits (~390px), forçant toute la page en
   défilement horizontal — pas seulement l'en-tête, la page entière semblait « décalée ».
   Corrigé en rendant l'en-tête réellement responsive (tailles réduites, recherche repliable
   sous forme d'icône en dessous de `sm`).
4. **Marge invisible dans l'image du logo** : l'icône du logo dans l'en-tête gardait un grand
   espace transparent malgré un espacement CSS réduit — le fichier image lui-même contenait
   une marge cachée (un halo à très faible opacité gonflait la zone de recadrage). Corrigé en
   recadrant l'image sur un seuil d'opacité plutôt que sur la simple présence de pixels non
   transparents.
5. **Liens internes de l'admin cassés par le sous-domaine propre** : faire pointer les liens
   de la barre latérale admin vers des URLs sans préfixe `/admin` aurait cassé le développement
   local (aucun sous-domaine dédié disponible sur `localhost` pour distinguer boutique et
   admin). Résolu par un préfixe calculé côté serveur selon le nom d'hôte de la requête,
   partagé aux composants via un contexte React — fonctionne à la fois en local
   (`/admin/...`) et sur `adminboard.oralyah.com` (`/...`, propre).

---

## 3. Limites connues

- **Pages légales non finalisées** : Mentions légales / CGV / Politique de confidentialité
  contiennent toujours des `[À COMPLÉTER]` (raison sociale, RCCM, IFU, adresse, n° APDP) —
  **masquées volontairement** (liens retirés du pied de page et du sitemap) tant que ce n'est
  pas rempli. Décision du client, pas un oubli. À faire relire par un avocat local une fois
  complétées, avant toute ouverture publique large.
- **Aucune sauvegarde automatique** : le plan gratuit Supabase n'inclut pas de sauvegardes
  automatiques de la base de données (fonctionnalité des plans payants). À surveiller si le
  volume de données/commandes devient significatif.
- **Limites des plans gratuits** : Netlify (bande passante, minutes de build) et Supabase
  (taille de base, requêtes) ont des plafonds sur leurs plans gratuits respectifs. Largement
  suffisant pour démarrer ; à surveiller en cas de pic de trafic important (le projet visait
  initialement un lancement porté par TikTok).
- **Catalogue de production actuellement vide** : les données de test utilisées pendant le
  développement ont été supprimées avant la livraison. Aucun vrai produit ni catégorie n'existe
  encore en production — à ajouter depuis `/admin` (voir section 5).
- **Aucun compte client, aucune notification email/SMS, aucun paiement en ligne** — choix
  assumés, inchangés depuis les cycles précédents (voir section 4).
- **Pas de tests automatisés côté rendu frontend** (le pgTAP + le test de concurrence couvrent
  le backend ; aucun test type Playwright ne rejoue le parcours visuel automatiquement).

---

## 4. Pistes d'amélioration restantes (non bloquantes)

1. **Compléter et faire relire les pages légales** par un avocat local, puis les
   réactiver (footer + sitemap) — seul point qui reste réellement bloquant pour une ouverture
   publique large.
2. **Peupler le vrai catalogue** (produits, catégories) — le site est vide en l'état.
3. **Parcours de bout en bout en conditions réelles** sur le nouveau design (voir section 2) —
   recommandé avant de considérer la mise en ligne pleinement validée.
4. **Tests frontend automatisés** (Playwright ou équivalent).
5. **Notifications** : aucune alerte (email/SMS) à l'admin à la réception d'une commande, ni au
   client au changement de statut.
6. **Paiement en ligne** (mobile money, carte) — évolution naturelle si le volume le justifie.
7. **Sauvegardes** : passer sur un plan Supabase payant (ou exporter régulièrement) si le
   volume de données le justifie.

---

## 5. Comment tester

L'ancienne procédure (`docker compose up`, `pytest`, `scripts.seed`) **ne fonctionne plus** —
elle décrivait une infra entièrement retirée ce cycle. Voir aussi `README.md`.

### Développement local

Nécessite le [CLI Supabase](https://supabase.com/docs/guides/cli) et Docker (pour la stack
Supabase locale uniquement — plus pour le frontend).

```bash
supabase start
cd frontend
npm install
npm run dev
```

- Boutique : http://localhost:3001
- Admin : http://localhost:3001/admin/login
- Supabase Studio (local) : http://localhost:54323

### Tests automatisés

```bash
# pgTAP — nécessite la stack locale démarrée (supabase start)
supabase test db

# Test de concurrence (verrouillage promo, 50 itérations)
cd supabase/tests/concurrency && npm install
npm run test:promo-race
```

### Tester le vrai site en production

- Boutique : https://oralyah.com
- Admin : https://adminboard.oralyah.com/login

Le catalogue de production est actuellement vide (voir section 3) — créer un produit test
depuis l'admin est nécessaire avant de pouvoir rejouer un vrai parcours client (ajout panier →
commande → suivi → avis).

### Parcours à rejouer manuellement (recommandé avant lancement public, voir section 2)

1. **Admin** : se connecter sur `adminboard.oralyah.com/login`, créer une catégorie, créer un
   produit avec au moins une image, vérifier qu'il apparaît sur la boutique.
2. **Client** : ajouter au panier, tester la recherche et le filtre par catégorie, passer une
   commande complète (position GPS requise), noter la référence de commande affichée.
3. **Suivi** : `oralyah.com/suivi-commande`, retrouver la commande par référence + téléphone.
4. **Avis** : dans l'admin, passer la commande au statut « Complétée », puis sur la fiche
   produit laisser un avis avec la même référence + téléphone, vérifier qu'il reste invisible
   jusqu'à modération, l'approuver dans l'admin, vérifier qu'il apparaît publiquement.
5. **Code promo** : créer un code depuis l'admin, l'appliquer au panier, vérifier la réduction
   et le total, valider la commande, vérifier le compteur d'utilisation incrémenté côté admin.
