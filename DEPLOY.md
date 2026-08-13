# Déploiement en production

Guide pour mettre le site en ligne sur un serveur avec un vrai nom de domaine et HTTPS. Prérequis : un serveur Ubuntu avec son adresse IP (voir `GUIDE-LANCEMENT.md` pour créer une instance Oracle Cloud gratuite si vous n'en avez pas encore), et un nom de domaine dont les DNS pointent déjà vers cette IP (voir étape 1).

## 1. DNS

Chez votre registrar (OVH, Namecheap, etc.), créez deux enregistrements **A** pointant vers l'IP du VPS :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` (ou votredomaine.com) | IP du VPS |
| A | `api` (donc api.votredomaine.com) | IP du VPS |

La propagation peut prendre de quelques minutes à quelques heures. Vérifiez avec `dig votredomaine.com` avant de continuer.

## 2. Préparer le serveur

```bash
# Sur un VPS Oracle Cloud : utilisateur `ubuntu` + la clé SSH téléchargée à la création
# (pas de connexion root directe) — utilisez la commande exacte affichée par la console
# Oracle au moment de créer l'instance, en général de cette forme :
ssh -i /chemin/vers/votre-cle.key ubuntu@<IP_DU_VPS>

# Docker + Compose
curl -fsSL https://get.docker.com | sudo sh
sudo apt-get install -y docker-compose-plugin git
sudo usermod -aG docker $USER && newgrp docker

# Pare-feu minimal côté serveur : seulement SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

**Spécifique à Oracle Cloud** : `ufw` ci-dessus ne suffit pas — le réseau virtuel (VCN) d'Oracle bloque tout par défaut en plus du pare-feu de la machine. Dans la console web, ouvrez la **Security List** du VCN associé à l'instance et ajoutez des règles entrantes autorisant les ports **80** et **443** (voir `GUIDE-LANCEMENT.md`, étape 5). Sans ça, Caddy ne recevra jamais de trafic externe même si tout est correct sur le serveur.

**Si vous êtes sur la forme gratuite `VM.Standard.E2.1.Micro` (1 Go de RAM seulement)** : le build de l'image frontend (étape 5) peut échouer ou être très lent faute de mémoire. Ajoutez un fichier swap avant de lancer le déploiement :

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Si vous avez pu obtenir la forme `VM.Standard.A1.Flex` (2 OCPU / 12 Go RAM), cette étape n'est pas nécessaire.

## 3. Récupérer le code

```bash
git clone <url-du-depot> /opt/ecommerce
cd /opt/ecommerce
```

(Si le code n'est pas dans un dépôt Git accessible depuis le serveur, transférez-le avec `rsync`/`scp` depuis votre machine à la place.)

## 4. Configurer les secrets

```bash
cp .env.production.example .env
nano .env
```

Remplissez **chaque** valeur marquée « Generate » dans le fichier avec une vraie valeur générée sur le serveur (jamais en réutilisant une valeur de développement) :

```bash
openssl rand -hex 24    # POSTGRES_PASSWORD
openssl rand -hex 32    # JWT_SECRET_KEY
openssl rand -base64 18 # ADMIN_PASSWORD (mot de passe admin initial — changeable ensuite depuis Paramètres)
```

Remplissez aussi `DOMAIN`, `API_DOMAIN`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` avec le vrai nom de domaine (voir les commentaires dans le fichier).

## 5. Lancer

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Premier démarrage : le build de l'image frontend (Next.js) prend quelques minutes. Les migrations de base de données s'appliquent automatiquement, y compris la création du compte admin initial. Caddy demande et installe automatiquement les certificats HTTPS (Let's Encrypt) pour `DOMAIN` et `API_DOMAIN` — ça ne fonctionne que si les DNS (étape 1) pointent déjà vers ce serveur.

Suivre les logs :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

## 6. Vérifier

- `https://votredomaine.com` → boutique
- `https://api.votredomaine.com/health` → `{"status":"ok"}`
- `https://votredomaine.com/admin/login` → connexion avec `ADMIN_USERNAME`/`ADMIN_PASSWORD` du `.env`
- Une fois connecté : **Paramètres** → changez immédiatement le mot de passe admin (celui du `.env` n'est utilisé qu'une seule fois, à la création du compte).
- Passez une vraie commande de test, vérifiez qu'elle apparaît dans l'admin.

## 7. Mises à jour futures

```bash
cd /opt/ecommerce
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Les migrations de base de données s'appliquent automatiquement au redémarrage du backend. Les données (base de données, images uploadées, certificats HTTPS) sont dans des volumes Docker nommés et survivent aux redéploiements.

## Sauvegardes

Aucune sauvegarde automatique n'est en place. Au minimum, planifiez une sauvegarde régulière de la base :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres \
  pg_dump -U ecommerce ecommerce > backup-$(date +%Y%m%d).sql
```

## En cas de problème

- **Un service ne démarre pas** : `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs <service>`
- **Certificat HTTPS non délivré** : vérifiez que les DNS pointent bien vers le serveur (`dig votredomaine.com`) et que les ports 80/443 sont bien ouverts — `ufw status` **et**, sur Oracle Cloud, la Security List du VCN dans la console (les deux doivent autoriser 80/443, `ufw` seul ne suffit pas sur cet hébergeur).
- **CORS bloqué côté navigateur** : `CORS_ORIGINS` dans `.env` doit correspondre exactement au domaine réel (avec `https://`, sans slash final).
