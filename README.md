# ORALYAH — E-commerce COD + Géolocalisation GPS

Boutique mobile en FCFA, checkout avec géolocalisation GPS obligatoire, paiement en espèces à
la livraison, et dashboard admin (catalogue, commandes, avis, codes promo).

En production : [oralyah.com](https://oralyah.com).

## Stack

- **Backend** : Supabase (Postgres managé + Auth + Storage), logique métier en fonctions RPC
  PL/pgSQL (`supabase/migrations/`)
- **Frontend** : Next.js 14 (App Router) / TypeScript, Tailwind CSS + shadcn/ui
- **Hébergement** : Netlify (déploiement automatique depuis `master` sur push)

## Démarrage rapide (développement local)

Nécessite le [CLI Supabase](https://supabase.com/docs/guides/cli) et Docker (pour la stack
locale Supabase — aucun compte requis).

```bash
supabase start
cp .env.example .env
# éditer .env avec les clés affichées par `supabase start`

cd frontend
npm install
npm run dev
```

- Boutique : http://localhost:3001
- Admin : http://localhost:3001/admin/login
- Supabase Studio (local) : http://localhost:54323

## Tests

```bash
# pgTAP (fonctions RPC, triggers, RLS) — nécessite la stack locale démarrée
supabase test db

# Test de concurrence (verrouillage promo) — installation séparée, une fois
cd supabase/tests/concurrency && npm install
npm run test:promo-race
```

## Structure

```
supabase/migrations/        Schéma, fonctions RPC, triggers, policies RLS
supabase/tests/database/    Suite pgTAP
supabase/tests/concurrency/ Test de concurrence (promo usage_limit)
frontend/                   Application Next.js (boutique + dashboard admin)
```

Voir `frontend/src/lib/api.ts` pour la couche d'accès aux données (appels Supabase/RPC) et
`frontend/src/app/` pour les pages.
