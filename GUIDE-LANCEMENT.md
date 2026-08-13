# Guide de lancement — étape par étape

Ce guide couvre tout ce qu'il y a à faire, dans l'ordre, **avant et pendant** la mise en ligne : choisir un nom, acheter un domaine, commander un serveur, puis déployer. La partie technique du déploiement (une fois que vous avez le serveur et le domaine) est dans `DEPLOY.md` — ce guide-ci vous y amène.

Les prix indiqués sont **indicatifs** (ils varient selon les promotions et le taux de change) — vérifiez le prix exact au moment de payer, en particulier le **prix de renouvellement** (souvent plus élevé que le prix de la première année).

---

## ✅ À faire maintenant (ne dépend de rien)

Ces deux étapes ne demandent ni serveur ni domaine — vous pouvez les faire tout de suite.

### Étape 1 — Choisir le nom de la boutique

Aucun site à visiter, juste une décision. Quelques critères pratiques :
- Court, facile à écrire et à prononcer à l'oral (important si vous le donnez par téléphone).
- Évitez les traits d'union, chiffres ou orthographes ambiguës.
- Vérifiez rapidement qu'il n'est pas déjà une marque connue dans votre secteur (recherche Google suffit à ce stade).

Une fois que vous avez 2-3 noms candidats, passez à l'étape 2 pour voir lesquels sont disponibles en `.com`.

### Étape 2 — Réunir les informations légales de l'entreprise

Nécessaire plus tard pour les pages Mentions légales / CGV / Politique de confidentialité (actuellement avec des `[À COMPLÉTER]`). Peut se préparer en parallèle, sans rien attendre :
- Raison sociale / nom de l'entreprise
- Numéro RCCM (Registre du Commerce et du Crédit Mobilier)
- Numéro IFU (Identifiant Fiscal Unique)
- Adresse physique de l'entreprise
- Un contact (téléphone/email) pour les réclamations clients

Si l'entreprise n'est pas encore formellement enregistrée, ce n'est pas bloquant pour tester le site, mais c'est requis avant une vraie ouverture publique (obligation légale au Bénin).

---

## Étape 3 — Vérifier la disponibilité du nom de domaine

**Site : [ovhcloud.com](https://www.ovhcloud.com)** (ou [namecheap.com](https://www.namecheap.com))

1. Allez sur la page d'accueil → barre de recherche « Domaines ».
2. Tapez vos noms candidats de l'étape 1, testez plusieurs extensions : `.com` (le plus simple/universel), `.bj` (extension du Bénin, plus chère, formalités locales possibles).
3. Notez ceux qui sont libres.

**Prix indicatifs (par an) :**
| Extension | Prix indicatif |
|---|---|
| `.com` | ~10-15 € (souvent moins cher la 1ère année, vérifiez le renouvellement) |
| `.bj` | ~35-60 € |

Cette étape ne coûte rien — vous pouvez chercher autant de noms que vous voulez avant de choisir.

---

## Étape 4 — Acheter le nom de domaine

Une fois le nom choisi et confirmé disponible, sur le **même site** (OVH ou Namecheap) :

1. Ajoutez le domaine au panier.
2. Créez un compte si vous n'en avez pas.
3. Payez (carte bancaire).
4. Vous recevez un accès à un « espace client » où gérer ce domaine — **gardez ces identifiants**, vous en aurez besoin à l'étape 6 pour configurer les DNS.

**Coût : le prix noté à l'étape 3, payé immédiatement (achat annuel).**

---

## Étape 5 — Créer le serveur (Oracle Cloud, gratuit à vie)

**Site : [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)**

Oracle Cloud offre un « Always Free » — pas un essai limité dans le temps, un vrai VPS gratuit tant que vous restez dans les quotas gratuits. C'est l'option choisie ici en attendant le budget pour un VPS payant classique.

1. Créez un compte. Une carte bancaire est demandée pour vérifier votre identité — elle **n'est pas débitée** tant que vous ne passez pas explicitement à un compte payant.
2. Une fois connecté, allez créer une **instance Compute** (menu « Compute » → « Instances » → « Create instance »).
3. Au moment de choisir la « forme » (shape) de la machine, deux options gratuites à vie existent — **prenez la première si elle est disponible** :

   | Forme | Ressources | Remarque |
   |---|---|---|
   | **VM.Standard.A1.Flex** (Ampere/ARM) — **à privilégier** | Jusqu'à 2 OCPU + 12 Go RAM | Bien plus confortable pour faire tourner le site (base de données + backend + frontend en même temps) |
   | VM.Standard.E2.1.Micro (AMD) — repli | 1 Go RAM seulement | Fonctionne, mais plus juste en mémoire (voir note dans `DEPLOY.md`) |

   Si la création de l'instance A1.Flex échoue avec une erreur **« out of host capacity »**, c'est une limitation connue d'Oracle (trop de demandes sur cette forme gratuite dans la région) — Oracle recommande d'essayer une autre zone de disponibilité dans le même écran, ou de réessayer plus tard. Si ça persiste, repliez-vous sur la forme E2.1.Micro pour ne pas rester bloqué.
4. Système d'exploitation : choisissez **Ubuntu** (dernière version proposée).
5. Oracle propose de générer une **paire de clés SSH** à ce moment — laissez-le faire et **téléchargez la clé privée** (fichier `.key` ou `.pem`) : c'est ce qui remplacera le mot de passe pour se connecter au serveur. Gardez ce fichier en lieu sûr, il ne sera plus jamais téléchargeable après.
6. Créez l'instance. Après quelques instants, notez l'**adresse IP publique** affichée sur la page de l'instance.
7. **Étape importante propre à Oracle Cloud** (absente chez un VPS classique) : dans le menu de l'instance, ouvrez la **« Security List »** du réseau (VCN) associé, et ajoutez deux règles entrantes autorisant les ports **80** et **443** (en plus du port 22 déjà ouvert par défaut pour SSH). Sans cette étape, le site restera injoignable depuis l'extérieur même une fois tout configuré correctement sur le serveur lui-même.

**Gardez précieusement : l'adresse IP, le fichier de clé SSH téléchargé, et la commande de connexion exacte qu'Oracle affiche** (généralement de la forme `ssh -i votre-cle.key ubuntu@<IP>`) — nécessaires pour le déploiement (`DEPLOY.md`, étape 2).

**Prix : 0 € — gratuit à vie, tant que vous restez dans les ressources « Always Free ».**

---

## Étape 6 — Pointer le domaine vers le serveur (DNS)

Retournez dans l'**espace client du domaine** (celui de l'étape 4) :

1. Trouvez la section « Zone DNS » du domaine acheté.
2. Créez deux enregistrements de type **A** :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` (ou vide, ou le nom du domaine lui-même) | l'IP du VPS (étape 5) |
| A | `api` | la même IP du VPS |

3. Sauvegardez. La propagation prend de quelques minutes à quelques heures.

---

## Étape 7 — Déployer

À partir d'ici, tout est technique et couvert dans **`DEPLOY.md`** : connexion SSH au serveur, installation de Docker, récupération du code, configuration des secrets, lancement. Je peux vous accompagner commande par commande à ce moment-là.

---

## Résumé des coûts

| Poste | Coût indicatif |
|---|---|
| Nom de domaine (`.com`) | ~10-15 €/an |
| Serveur (Oracle Cloud Always Free) | **0 €** |
| **Total 1ère année** | **~10-15 €** |

Rien d'autre n'est requis pour faire tourner le site tel qu'il est construit aujourd'hui (pas de coût de licence, pas d'abonnement à un service tiers). Seul le nom de domaine reste un achat obligatoire — impossible à obtenir gratuitement pour un vrai domaine de marque.
