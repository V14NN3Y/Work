# Rapport de développement — E-commerce Autonome COD + GPS

Ce document résume ce qui a été construit, ce qui fonctionne (vérifié réellement, pas seulement supposé), les limites connues, les pistes d'amélioration, et surtout **comment tester l'application vous-même**.

Ce rapport a été mis à jour après un troisième cycle de travail : mise à niveau vers un e-commerce complet « aux normes » — conformité légale (Bénin), nouvelle identité visuelle, SEO, fonctionnalités catalogue avancées (catégories, avis clients, codes promo), suivi de commande client, et audit d'accessibilité. Le second cycle (refonte visuelle shadcn/ui, debounce, pagination, sécurité admin) reste documenté ci-dessous.

---

## 1. Ce qui a été fait

Une plateforme e-commerce complète, construite de zéro, en trois blocs :

| Bloc | Contenu |
|---|---|
| **Backend** | API FastAPI (Python) : catalogue public, commandes, auth admin JWT (mot de passe **haché bcrypt**), gestion catalogue (CRUD + galerie d'images), gestion commandes. Base PostgreSQL avec migrations Alembic. |
| **Frontend** | Application Next.js (TypeScript) : boutique mobile (catalogue, fiche produit, panier/checkout avec GPS), dashboard admin (catalogue + commandes). Design system **shadcn/ui** + Tailwind, polices Rubik/Nunito Sans auto-hébergées. |
| **Infra** | Docker Compose : un `docker compose up` démarre Postgres + backend + frontend, avec migrations automatiques au démarrage. |

Détail des fonctionnalités livrées :
- Catalogue produit avec grille responsive, ajout rapide au panier, fiche produit détaillée avec **galerie multi-images** (upload, réordonnancement, suppression) — une extension du schéma fourni à l'origine (qui ne prévoyait qu'une image par produit).
- Panier persistant (localStorage), calcul dynamique des sous-totaux/total, **pagination** du catalogue.
- Checkout avec géolocalisation GPS **obligatoire** (conforme au schéma de données fourni : `latitude`/`longitude` non nuls), gestion des erreurs de permission avec bouton de nouvelle tentative.
- Paiement unique : espèces à la livraison.
- Dashboard admin protégé par authentification (compte unique, JWT, **mot de passe haché**) : CRUD catalogue, suivi des commandes avec filtrage par statut et **pagination**, lien Google Maps généré automatiquement à partir des coordonnées GPS du client, changement de statut (avec restauration automatique du stock en cas d'annulation).
- Génération automatique d'une référence de commande unique, décrément du stock à la commande.
- **Refonte visuelle complète** (voir section 2) : identité visuelle propre, typographie dédiée, composants shadcn/ui (menus, boîtes de dialogue, notifications toast) sur toute l'application — boutique et dashboard admin.

### Ajouts du troisième cycle — mise à niveau « e-commerce complet »

| Chantier | Contenu |
|---|---|
| **Nouvelle identité visuelle** | Palette « Ambre chaleureux & bleu confiance » (`#B45309` marque/liens, `#2563EB` boutons d'achat) — remplace le vert/orange initial, jugé peu harmonieux. Contrastes vérifiés WCAG AA (calcul de luminance relative, pas seulement visuel) avant application. |
| **Conformité légale (Bénin)** | Pages *Mentions légales*, *CGV*, *Politique de confidentialité* structurées autour du Code du Numérique béninois (loi n°2017-20) et des obligations APDP, avec emplacements `[À COMPLÉTER]` clairement marqués pour vos informations réelles (raison sociale, RCCM, IFU, numéro APDP). **Ces pages ne sont pas des documents juridiques finaux** — une relecture par un avocat local est recommandée avant publication. Lien vers ces pages + le suivi de commande ajouté dans un nouveau pied de page sur toute la boutique. |
| **SEO & découvrabilité** | `sitemap.xml` et `robots.txt` générés automatiquement (incluent chaque fiche produit, excluent `/admin`), balises Open Graph/Twitter Card, données structurées Schema.org (`Product`, prix en XOF, disponibilité) sur chaque fiche produit. |
| **Suivi de commande client** | Recherche publique par référence de commande + numéro de téléphone (`/suivi-commande`, lié depuis le pied de page et la page de confirmation) — **sans création de compte client**, cohérent avec le fait qu'aucune authentification client n'existe. Message d'erreur volontairement identique que la référence soit inconnue ou le téléphone incorrect, pour empêcher de deviner des références de commande par tâtonnement. |
| **Catégories & filtres** | Catégories gérées depuis l'admin, filtre par catégorie sur le catalogue public (liens cliquables, compatibles avec la pagination existante). |
| **Avis clients** | Un client ne peut laisser un avis que sur un produit d'une commande **terminée** dont il prouve la référence + le téléphone (même mécanisme que le suivi de commande) — un avis par produit et par commande. Chaque avis reste **masqué** (« en attente ») jusqu'à modération explicite dans l'admin ; seuls les avis approuvés apparaissent publiquement, avec la note moyenne. |
| **Codes promo** | Réduction en pourcentage ou montant fixe, avec montant minimum de commande, plafond de réduction, date d'expiration et **limite d'utilisation totale** appliquée de façon sûre même si deux clients commandent au même instant (verrouillage de ligne en base, testé avec deux connexions simultanées réelles — un seul des deux passages doit réussir). Aperçu de la réduction dans le panier avant validation. |
| **Audit d'accessibilité** | Texte alternatif sur toutes les images (dont un oubli corrigé dans la galerie admin), lien d'évitement « Aller au contenu » ajouté (absent jusqu'ici), correction d'un composant de notation par étoiles qui utilisait un rôle ARIA incomplet (`radiogroup` sans la navigation clavier associée — remplacé par un composant plus simple et réellement accessible). |
| **Robustesse** | L'application n'avait **aucune page d'erreur** : une erreur de rendu imprévue (trouvée pendant les tests — une image provenant d'un domaine non autorisé) faisait disparaître toute la page (écran blanc), sans aucun message. Ajout d'un vrai écran d'erreur récupérable (`error.tsx`) et d'une page 404 propre (`not-found.tsx`) — corrige la classe de bug entière, pas seulement le cas rencontré. |

**Ce qui n'a volontairement pas été ajouté ce cycle** : compte client, notifications email/SMS, moyens de paiement en ligne — hors du périmètre validé avec vous (voir section 4 pour les pistes restantes).

---

## 2. Ce qui fonctionne bien (vérifié, pas juste écrit)

Tout ce qui suit a été **testé en conditions réelles** (suite de tests automatisés + navigateur piloté), pas seulement relu :

- **38 tests backend automatisés passent** (`pytest`) : produits publics/admin, commandes (création, stock insuffisant, annulation → restauration stock), authentification, catégories, suivi de commande (bon/mauvais téléphone, référence inconnue), avis clients (preuve d'achat, doublon bloqué, cycle de modération complet), codes promo (pourcentage, montant fixe plafonné, montant minimum, expiration, limite d'utilisation) — dont **un test de concurrence réel** avec deux connexions base de données indépendantes créant deux commandes simultanées sur un code limité à une seule utilisation, confirmant qu'une seule des deux passe.
- **Parcours client rejoué de bout en bout dans un vrai navigateur**, avec le nouveau design : ajout au panier → panier persistant après navigation → formulaire rempli → position GPS capturée (coordonnées affichées, bouton de validation qui ne s'active qu'une fois la position obtenue) → commande soumise → page de confirmation avec référence → panier vidé. La commande est ensuite retrouvée correctement côté admin avec les **coordonnées GPS exactes** et le lien Google Maps correspondant.
- **Parcours admin vérifié visuellement et fonctionnellement**, avec le nouveau design : connexion, liste des commandes avec filtres de statut et pagination, menu d'actions (⋮) par produit, **boîte de dialogue de confirmation** avant suppression définitive (remplace l'ancienne popup native du navigateur), recherche produit qui n'envoie **plus qu'une requête** après une frappe rapide (vérifié : 6 lettres tapées → 1 seul appel API, au lieu de 6), fiche produit en édition avec galerie d'images (upload réel d'image → conversion WebP → affichage correct), catalogue avec recherche et masquage/affichage.
- **Cycle complet avis client vérifié de bout en bout** : soumission d'un avis avec preuve d'achat → statut « en attente » (invisible publiquement) → apparition dans la file de modération admin → approbation → apparition publique sur la fiche produit avec la note moyenne correcte.
- **Cycle complet code promo vérifié de bout en bout** : création d'un code depuis l'admin → aperçu de la réduction avant commande → commande créée avec le total réduit → compteur d'utilisation incrémenté → visible côté admin sur la commande concernée.
- **Passe de vérification visuelle** sur l'ensemble des pages (existantes + nouvelles : catégories, suivi de commande, avis, codes promo, pages légales) : aucun problème de mise en page, de débordement ou de contraste trouvé.
- Génération d'images de démonstration **100 % locale** (aucune dépendance à un service externe), cohérent avec l'esprit « autonome » du projet. Polices également auto-hébergées (aucun appel à Google Fonts au chargement).
- Zones cliquables ≥ 48px sur tous les boutons/champs partagés (boutique + formulaires admin) ; les icônes denses propres à l'admin (menu ⋮, réordonnancement de galerie) restent volontairement plus compactes (40-44px), toujours au-dessus du plancher d'accessibilité recommandé (24px).

### Bugs réels trouvés et corrigés pendant cette vérification

Ces bugs ne se seraient pas vus à la simple lecture du code — ils sont sortis des tests en conditions réelles, sur les trois cycles de travail :

1. **Panier vidé silencieusement** : en mode développement (React Strict Mode), une course entre la lecture et l'écriture du panier dans `localStorage` pouvait effacer le panier à chaque navigation complète. Corrigé.
2. **Incohérence d'affichage des coordonnées GPS** : le lien Maps généré juste après la commande n'avait pas le même format que celui affiché plus tard dans le dashboard admin (précision décimale différente). Corrigé.
3. **Images cassées côté boutique** : les URLs d'images renvoyées par l'API (chemins relatifs `/uploads/...`) n'étaient pas résolues vers la bonne adresse par le frontend. Corrigé.
4. **CORS mal configuré** : le port réel du frontend (3001, voir section suivante) ne correspondait pas à l'origine autorisée côté backend, bloquant silencieusement tous les appels admin. Corrigé.
5. **Écran blanc sans message en cas d'erreur** (trouvé pendant les tests du troisième cycle) : l'application n'avait aucune page d'erreur — une image avec une URL inattendue suffisait à faire disparaître toute la page, sans aucun message pour l'utilisateur ni moyen de s'en sortir autrement qu'en rechargeant. Corrigé par l'ajout d'un vrai écran de récupération.
6. **Filtre par catégorie cassant la pagination** : l'ajout du paramètre `?category=...` dans l'URL du catalogue entrait en conflit avec la construction des liens de pagination (qui supposait à tort qu'aucun `?` n'était déjà présent). Corrigé avant mise en production de la fonctionnalité.

---

## 3. Limites connues

Rien n'est « cassé » dans les parcours testés, mais voici les points à avoir en tête :

- **Pages légales non finalisées juridiquement** : les pages Mentions légales / CGV / Politique de confidentialité sont structurées et informées (Code du Numérique béninois, APDP), mais contiennent des emplacements `[À COMPLÉTER]` pour vos informations réelles d'entreprise (raison sociale, RCCM, IFU, adresse, hébergeur, numéro de récépissé APDP). **Ne pas publier tel quel** — compléter ces informations et faire relire par un avocat local. Voir `frontend/src/app/(shop)/mentions-legales/page.tsx`, `cgv/page.tsx`, `politique-de-confidentialite/page.tsx`.
- **Port 3000 → 3001** : sur cette machine, le port 3000 était déjà utilisé par un autre processus. La boutique tourne donc sur **http://localhost:3001** (et non 3000). C'est documenté dans le `README.md`.
- **Pas de repli si le client refuse le GPS** : c'est un choix assumé (validé avec vous pendant la planification) — sans position GPS, la commande ne peut pas être finalisée. Si un client refuse durablement la permission de localisation, il ne peut pas commander.
- **Compte admin unique** — adapté à l'usage prévu (un seul gérant). Le mot de passe est maintenant haché (bcrypt) plutôt que stocké en clair (voir section 5 pour configurer un hash de production), mais il n'y a toujours qu'un seul compte, sans gestion de rôles.
- **Session admin stockée dans `localStorage`** (pas de cookie sécurisé httpOnly) — choix pragmatique pour un back-office mono-utilisateur, documenté dans le code (`lib/adminAuth.ts`).
- **Format de téléphone générique** (`+ou non, 8 à 15 chiffres`) — le cahier des charges ne précisait pas de pays cible exact.
- **Aucun compte client** : choix assumé (validé avec vous) — le suivi de commande et le dépôt d'avis se font par référence de commande + téléphone, sans inscription. Un client ne peut pas voir l'historique de *toutes* ses commandes en une seule fois, seulement les retrouver une par une avec leur référence.
- **Le script de peuplement (`scripts.seed`) ne crée pas de catégories ni de codes promo** — ces deux fonctionnalités doivent être configurées manuellement depuis l'admin après le premier démarrage (voir section 5).
- **Pas de tests automatisés côté frontend** (seul le backend a une suite `pytest`, 38 tests). La vérification du frontend a été faite manuellement/scriptée pendant les sessions de développement, mais n'est pas rejouable automatiquement en CI pour l'instant.
- **Mode développement uniquement** : `docker compose up` lance le frontend et le backend en mode dev (rechargement à chaud), pas en build de production optimisé. À adapter avant une mise en ligne réelle (build Next.js, plusieurs workers Uvicorn, HTTPS via reverse proxy).

---

## 4. Pistes d'amélioration restantes (non bloquantes)

Les points des cycles précédents (debounce recherche, pagination, mot de passe admin haché, conformité légale, SEO, catégories, avis, codes promo, accessibilité, suivi de commande) ont été traités — voir section 1 et 2. Ce qui reste, par ordre d'impact probable :

1. **Compléter et faire relire les pages légales** par un avocat local avant toute mise en ligne réelle (voir section 3) — c'est le seul point bloquant pour une ouverture publique du site.
2. **Tests frontend automatisés** (Playwright ou équivalent) pour rejouer le parcours client/admin en continu, plutôt que manuellement.
3. **Build de production** pour le Docker Compose (image Next.js optimisée, Uvicorn multi-workers, reverse proxy HTTPS) avant un déploiement réel.
4. **Stockage image en production** : actuellement sur disque local (choix validé pour cette V1) — prévoir S3/MinIO si plusieurs instances du backend doivent tourner en parallèle.
5. **Durcissement supplémentaire de l'admin** : cookie httpOnly + BFF plutôt que JWT en `localStorage`, si le risque de vol de session par XSS devient une préoccupation réelle.
6. **Notifications** : aucune alerte (email/SMS) n'est envoyée à l'admin à la réception d'une commande, ni au client au changement de statut — il faut consulter le dashboard ou utiliser le suivi de commande.
7. **Paiement en ligne** : le site reste exclusivement paiement à la livraison — un moyen de paiement en ligne (mobile money, carte) serait une évolution naturelle si le volume de commandes le justifie.

---

## 5. Comment tester

### Prérequis
- Docker + Docker Compose installés (déjà utilisés pour cette vérification).

### Démarrage

```bash
cd /home/billvianney/Work
docker compose up --build
```

Au premier démarrage, les migrations de base de données s'appliquent automatiquement. Attendre les lignes `Application startup complete` (backend) et `Ready` (frontend) dans les logs.

- Boutique : **http://localhost:3001**
- Admin : **http://localhost:3001/admin/login**
- API + documentation interactive : **http://localhost:8000/docs**

### Peupler des données de démonstration

```bash
docker compose exec backend python -m scripts.seed
```

Crée 6 produits avec images générées localement (aucune connexion internet requise).

### Tests automatisés (backend)

```bash
docker compose exec backend python -m pytest -v
```

→ 38 tests doivent passer (produits, commandes, authentification, catégories, suivi de commande, avis clients, codes promo — dont un test de concurrence réel).

### Test manuel — parcours client

1. Ouvrir http://localhost:3001 → vérifier le catalogue (images, prix en FCFA, cartes avec effet au survol).
2. Cliquer sur un produit → vérifier la fiche détaillée (galerie, description, sélecteur de quantité).
3. Ajouter au panier, ouvrir le panier (bouton « Panier » avec pastille de compteur bleue en haut à droite).
4. Modifier une quantité / supprimer un article → vérifier que le total se recalcule.
5. Remplir le formulaire (nom, téléphone, adresse).
6. Cliquer sur « Partager ma position GPS » et autoriser la géolocalisation dans le navigateur.
7. Vérifier que le bouton « Valider la commande » reste désactivé (grisé) tant que la position n'est pas capturée, puis s'active (bleu) une fois obtenue.
8. Valider → vérifier la page de confirmation avec la référence de commande (`CMDxxxxxx`).
9. Retourner à la boutique → vérifier que le panier est vide.

### Test manuel — parcours admin

1. Ouvrir http://localhost:3001/admin/login.
2. Se connecter avec les identifiants définis dans `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, par défaut `admin` / `change-me`).
3. Onglet **Commandes** : retrouver la commande passée à l'étape précédente, filtrer par statut, tester la pagination si plus de 20 commandes, cliquer sur « Voir sur Maps » (doit ouvrir la position GPS exacte), changer son statut via le menu déroulant coloré.
4. Onglet **Catalogue** : taper rapidement dans la recherche (vérifier qu'elle ne se déclenche qu'après une courte pause), créer un nouveau produit, l'ouvrir en édition, uploader une ou plusieurs images (galerie), les réordonner, masquer un produit puis vérifier qu'il disparaît du catalogue public, cliquer sur le menu ⋮ d'un produit déjà commandé → Supprimer → confirmer dans la boîte de dialogue → vérifier le message de refus (produit déjà commandé).

### Test manuel — catégories, suivi de commande, avis clients, codes promo

1. **Catégories** : Admin → onglet **Catégories** → créer une catégorie (ex. « Électronique »). Éditer un produit et lui assigner cette catégorie. Retourner sur la boutique publique : un filtre par catégorie doit apparaître au-dessus du catalogue.
2. **Suivi de commande** : passer une commande, noter sa référence (`CMDxxxxxx`). Aller sur **http://localhost:3001/suivi-commande** (lien aussi présent dans le pied de page et sur la page de confirmation), saisir la référence + le téléphone utilisé → le statut, les articles et le total doivent s'afficher. Tester avec un mauvais numéro : le message d'erreur doit être générique (ne doit pas révéler si c'est la référence ou le téléphone qui est faux).
3. **Avis clients** : passer une commande, puis dans l'admin passer son statut à **Complétée**. Sur la fiche du produit commandé, cliquer sur « Laisser un avis », saisir la référence + le téléphone, une note et un commentaire. L'avis n'apparaît **pas encore** publiquement. Dans Admin → onglet **Avis**, le retrouver dans le filtre « En attente », l'approuver → il doit maintenant apparaître sur la fiche produit avec la note moyenne mise à jour.
4. **Codes promo** : Admin → onglet **Codes promo** → créer un code (ex. `BIENVENUE10`, pourcentage, 10). Ajouter un produit au panier, saisir le code dans le champ prévu sur la page panier → la réduction et le nouveau total doivent s'afficher immédiatement. Finaliser la commande : le total réduit doit être conservé, et le nombre d'utilisations du code doit s'incrémenter dans l'admin.

### Vérifier les pages légales et le SEO

```bash
curl http://localhost:3001/sitemap.xml
curl http://localhost:3001/robots.txt
```

Ouvrir également **http://localhost:3001/mentions-legales**, **/cgv** et **/politique-de-confidentialite** — vérifier que les pages se chargent et que le pied de page y renvoie depuis n'importe quelle page de la boutique. Rappel : ces pages contiennent des `[À COMPLÉTER]` à remplir avant publication (voir section 3).

### Configurer un mot de passe admin haché (optionnel, recommandé en production)

Par défaut, `ADMIN_PASSWORD` (en clair dans `.env`) est haché automatiquement au démarrage — aucune action requise en développement. Pour éviter tout mot de passe en clair dans le fichier `.env` :

```bash
docker compose exec backend python -c "import bcrypt; print(bcrypt.hashpw(b'votre-mot-de-passe', bcrypt.gensalt()).decode())"
```

Copier le résultat dans `.env` sous `ADMIN_PASSWORD_HASH=...` (remplace alors `ADMIN_PASSWORD`).

### Test API direct (optionnel)

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/products
```

Ou utiliser l'interface Swagger interactive : http://localhost:8000/docs

### Réinitialiser les données de test

```bash
docker compose exec postgres psql -U ecommerce -d ecommerce -c "TRUNCATE reviews, order_items, orders, promo_codes, product_images, products, categories RESTART IDENTITY CASCADE;"
docker compose exec backend python -m scripts.seed
```

Le script de peuplement ne recrée ni catégories ni codes promo — à créer manuellement depuis l'admin si besoin après la réinitialisation.
