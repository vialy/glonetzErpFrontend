# Glonetz — Portail Staff (Admin / Manager / Comptable)

Application Next.js pour le personnel : administration, finances, apprenants, réclamations.

## Lancer en local

**1. Backend** (dans `glonetzErpBackend-feat-ansel`) :

```bash
cp .env.example .env   # MONGO_URI + secrets
npm install
npm run dev            # http://localhost:4000
```

**2. Frontend admin** :

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

Variables d'environnement (`.env.local`) :

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_DATA_PROVIDER=api
```

Compte admin par defaut du backend local (voir `.env` backend) : `admin@glonez.com` / `ChangeMe123!`

`NEXT_PUBLIC_DATA_PROVIDER=mock` pour le mode démo sans backend.

## Comptes mock (mode démo)

| Rôle      | E-mail              | Mot de passe |
|-----------|---------------------|--------------|
| Admin     | admin@glonetz.cm    | Admin1234    |
| Manager   | manager@glonetz.cm  | Manager1234  |
| Comptable | comptable@glonetz.cm| Comptable1234|

## Portail apprenant

Voir `../glonetz-student-frontend` (port **3001**).

## Structure du code

| Dossier       | Rôle                                      |
|---------------|-------------------------------------------|
| `app/`        | Pages Next.js                             |
| `components/` | Interface utilisateur                     |
| `domains/`    | Logique métier + appels API               |
| `services/`   | Données mock + traductions                |
| `hooks/`      | Hooks React                               |
| `lib/`        | Utilitaires                               |
| `core/api/`   | Client HTTP                               |
