# Backend API Contract (Glonetz UI)

This document defines the API contract expected by the frontend.
It is organized by domain and matches the current architecture:
- `domains/auth`
- `domains/payments`
- `domains/claims`
- `domains/certificates`

## Environment

Frontend expects:

```env
NEXT_PUBLIC_DATA_PROVIDER=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Global Conventions

- **Date format**: ISO string (example: `2026-03-23T10:00:00.000Z`)
- **Amounts**: number (not string)
- **Content-Type**: `application/json` except file upload endpoint (`multipart/form-data`)
- **Auth**: Bearer token in `Authorization` header (or compatible cookie/session strategy)

### Enums

- `UserRole`: `admin | manager | student | accountant`
- `PaymentMethod`: `orange_money | mtn_momo | cash`
- `ClaimPaymentMethod`: `orange_money | mtn_momo`
- `ClaimStatus`: `en_attente | en_cours | resolue | rejetee`
- `CertificateStatus`: `en_cours | disponible`

---

## Auth Domain

### POST `/auth/login`

Request:

```json
{
  "phone": "+237600000001",
  "pin": "0000"
}
```

Response `200`:

```json
{
  "token": "jwt_or_session_token",
  "role": "student",
  "mustChangePin": true
}
```

Error examples:
- `401 INVALID_CREDENTIALS`

### POST `/auth/change-pin`

Request:

```json
{
  "currentPin": "0000",
  "newPin": "1234"
}
```

Response: `200` or `204` (no body)

### POST `/auth/request-pin-reset`

Request:

```json
{
  "phone": "+237600000001"
}
```

Response: `200` or `204` (no body)

### POST `/auth/reset-pin`

Request:

```json
{
  "phone": "+237600000001",
  "tempPin": "4567",
  "newPin": "1234"
}
```

Response: `200` or `204` (no body)

---

## Payments Domain

### GET `/payments/me/summary`

Response `200`:

```json
{
  "studentName": "Etudiant Demo",
  "className": "A1",
  "totalTuition": 160000,
  "amountPaid": 70000,
  "remainingAmount": 90000
}
```

### GET `/payments/me`

Response `200`:

```json
[
  {
    "id": "PAY-1710000000000",
    "date": "2026-03-23T10:00:00.000Z",
    "amount": 10000,
    "method": "orange_money",
    "note": "Paiement partiel",
    "sourceClaimId": "CLM-1710000000000"
  }
]
```

### POST `/payments`

Request:

```json
{
  "amount": 10000,
  "method": "mtn_momo",
  "note": "Mars"
}
```

Response `200` or `201`:

```json
{
  "id": "PAY-1710000000001",
  "date": "2026-03-23T12:00:00.000Z",
  "amount": 10000,
  "method": "mtn_momo",
  "note": "Mars"
}
```

Error examples:
- `400 INVALID_AMOUNT`
- `400 AMOUNT_EXCEEDS_REMAINING`

### POST `/payments/claims/apply`

Request:

```json
{
  "claimId": "CLM-1710000000000",
  "amount": 10000,
  "method": "orange_money",
  "note": "Paiement reconnu apres verification reclamation"
}
```

Response `200`:

```json
{
  "id": "PAY-1710000000002",
  "date": "2026-03-23T13:00:00.000Z",
  "amount": 10000,
  "method": "orange_money",
  "note": "Paiement reconnu apres verification reclamation",
  "sourceClaimId": "CLM-1710000000000"
}
```

---

## Claims Domain

### GET `/claims/me`

Response `200`:

```json
[
  {
    "id": "CLM-1710000000000",
    "createdAt": "2026-03-23T09:00:00.000Z",
    "amount": 10000,
    "paymentMethod": "orange_money",
    "phoneNumber": "6XXXXXXXX",
    "transactionReference": "OMF123456",
    "description": "Compte debite non reflete",
    "screenshotName": "preuve.jpg",
    "screenshotDataUrl": "https://cdn.example.com/proofs/preuve.jpg",
    "status": "en_attente"
  }
]
```

### POST `/claims` (multipart/form-data)

Fields:
- `amount` (number)
- `paymentMethod` (`orange_money` or `mtn_momo`)
- `phoneNumber` (string)
- `transactionReference` (string)
- `description` (string)
- `screenshot` (file, optional)

Response `200` or `201`:

```json
{
  "id": "CLM-1710000000001",
  "createdAt": "2026-03-23T14:00:00.000Z",
  "amount": 15000,
  "paymentMethod": "mtn_momo",
  "phoneNumber": "6XXXXXXXX",
  "transactionReference": "MTN123456",
  "description": "Paiement debite mais non visible",
  "screenshotName": "capture.png",
  "screenshotDataUrl": "https://cdn.example.com/proofs/capture.png",
  "status": "en_attente"
}
```

### PATCH `/claims/:id/status`

Request:

```json
{
  "status": "resolue"
}
```

Response `200`:

```json
{
  "id": "CLM-1710000000001",
  "createdAt": "2026-03-23T14:00:00.000Z",
  "amount": 15000,
  "paymentMethod": "mtn_momo",
  "phoneNumber": "6XXXXXXXX",
  "transactionReference": "MTN123456",
  "description": "Paiement debite mais non visible",
  "status": "resolue"
}
```

---

## Certificates Domain

### GET `/certificates/me/enrolled-level`

Response `200`:

```json
{
  "level": "A2"
}
```

### PUT `/certificates/me/enrolled-level`

Request:

```json
{
  "level": "B1"
}
```

Response: `200` or `204` (no body)

### GET `/certificates`

Response `200`:

```json
[
  {
    "id": "cert-a1",
    "level": "A1",
    "status": "disponible",
    "issuedAt": "2025-11-08T10:30:00.000Z"
  }
]
```

### GET `/certificates/me`

Response `200`:

```json
[
  {
    "id": "cert-a1",
    "level": "A1",
    "status": "disponible",
    "issuedAt": "2025-11-08T10:30:00.000Z"
  },
  {
    "id": "cert-a2",
    "level": "A2",
    "status": "en_cours"
  }
]
```

---

## Notes For Integration

1. If backend routes differ, update only:
   - `domains/*/providers/http.ts`
2. If backend field names differ (example: `amount_paid`), map them in providers before returning to UI types.
3. UI pages/components should not call endpoints directly.
4. Frontend can switch between mock and api using `NEXT_PUBLIC_DATA_PROVIDER`.

