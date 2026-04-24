# Payments API contract (Frontend expectations)

Ce document résume le contrat **que le frontend “paiements étudiant” attend** aujourd’hui.
Il sert de base de synchronisation avec le backend.

## Endpoints utilisés par le front

Préfixe API : `NEXT_PUBLIC_API_BASE_URL` (voir `core/api/client.ts`).

### 1) Résumé scolarité
- `GET /payments/me/summary`
- Auth : cookie `glonetz_session` (token) → header `Authorization: Bearer <token>`
- Réponse attendue (par défaut côté UI) :
  - `studentName: string`
  - `className: string`
  - `totalTuition: number`
  - `amountPaid: number`
  - `remainingAmount: number`

Le frontend normalise aussi des variantes possibles (selon le backend), ex. :
- `StudentName` / `studentName`
- `ClassName` / `className`
- `TuitionAmount` / `totalTuition`
- `PaidAmount` / `amountPaid`
- `RemainingAmount` / `remainingAmount`

### 2) Liste des paiements
- `GET /payments/me`
- Réponse attendue : tableau d’objets paiement
- Chaque paiement doit permettre à l’UI de récupérer :
  - `id: string` (ou `PaymentId`)
  - `date: string` (ou `PaidAt` / `CreatedAt`)
  - `amount: number` (ou `Amount`)
  - `method: "orange_money" | "mtn_momo" | "cash"` (ou `PaymentMethod` / `CashoutMethod`)
  - `note?: string` (ou `Description`)
  - `sourceClaimId?: string` (si lié à une réclamation)

### 3) Création d’un paiement
- `POST /payments`
- Body (format JSON attendu par l’UI actuelle) :
  - `amount: number`
  - `method: "orange_money" | "mtn_momo" | "cash"`
  - `note?: string`
  - (optionnel côté types UI) `classId?: string`, `currencyCode?: string`

Réponse attendue : un objet paiement utilisable par l’UI (normalisation en place).

### 4) Paiement via réclamation
- `POST /payments/claims/apply`
- Body :
  - `claimId: string`
  - `amount: number`
  - `method: "orange_money" | "mtn_momo"` (pas `cash`)
  - `note?: string`

Réponse attendue : un objet paiement.

## Gestion des erreurs

`core/api/client.ts` lève une exception `ApiClientError` si `response.ok === false`.
Dans le provider paiements (`domains/payments/providers/http.ts`), le front tente d’extraire un **code métier** depuis `ApiClientError.payload` :
- priorités : `code`, `errorCode`, `type`, `error`, `message`, `key`

Puis le front jette `new Error(<code métier>)` :
- `AMOUNT_EXCEEDS_REMAINING` → message “montant dépasse le reste”
- `INVALID_AMOUNT` → message “montant invalide”
- sinon → message générique

## Liens dans le code (pour comprendre l’alignement)
- Client HTTP : `core/api/client.ts`
- Paiements HTTP provider + erreurs : `domains/payments/providers/http.ts`
- Types UI : `domains/payments/types.ts`
- Mock dev : `services/student-payments.service.ts`
- Pages UI concernées :
  - `app/dashboard/effectuer-paiement/page.tsx`
  - `app/dashboard/mes-paiements/page.tsx`

## Points à confirmer avec le backend

1. Le backend renvoie-t-il des clés en `camelCase` ou `snake_case` ?
2. Les endpoints ci-dessus existent-ils avec les mêmes méthodes ?
3. Le backend renvoie-t-il `PaidAt`/`CreatedAt` (pour mapper vers `date`) ?
4. La structure d’erreur contient-elle un champ stable (`code`, `errorCode`, etc.) ?

