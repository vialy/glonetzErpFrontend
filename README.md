# Glonetz — Portail Staff (Admin / Manager / Comptable)

Application Next.js pour le personnel : administration, finances, apprenants, réclamations.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

Variables d'environnement (`.env.local`) :

```env
NEXT_PUBLIC_API_BASE_URL=https://glonetzerpbackend-1.onrender.com
NEXT_PUBLIC_DATA_PROVIDER=api
```

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
