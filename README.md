# E-commerce Autonome — COD + Géolocalisation GPS

Plateforme e-commerce sur-mesure : boutique mobile en FCFA, checkout avec géolocalisation GPS
obligatoire, paiement en espèces à la livraison, et dashboard admin (catalogue + commandes).

## Stack

- **Backend** : Python / FastAPI, SQLAlchemy (async) + Alembic, PostgreSQL, JWT (admin unique)
- **Frontend** : Next.js (App Router) / TypeScript, Tailwind CSS
- **Orchestration** : Docker Compose

## Démarrage rapide

```bash
cp .env.example .env
# éditer .env : définir ADMIN_USERNAME / ADMIN_PASSWORD / JWT_SECRET_KEY / mots de passe Postgres

docker compose up --build
```

- Boutique : http://localhost:3001
- Admin : http://localhost:3001/admin/login
- API : http://localhost:8000 (docs interactives sur http://localhost:8000/docs)

Au premier démarrage, le backend applique automatiquement les migrations Alembic.

## Peupler des données de démonstration

```bash
docker compose exec backend python -m scripts.seed
```

## Tests backend

```bash
docker compose exec backend python -m pytest
```

## Structure

```
backend/    API FastAPI (routers publics + admin, modèles SQLAlchemy, migrations Alembic)
frontend/   Application Next.js (boutique + dashboard admin)
```

Voir `backend/app/routers/` pour les contrats d'API et `frontend/src/app/` pour les pages.
