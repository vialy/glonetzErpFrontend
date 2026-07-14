"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import type { AdminPaymentItem } from "@/services/admin-mock.service"

/** Forme brute d'un paiement renvoye par GET /staff/payments (userId/classId peuples). */
type ApiUserRef = { userId?: string; name?: string; email?: string; phone?: string }
type ApiClassRef = { classId?: string; title?: string }

type ApiStaffPayment = {
  paymentId?: string
  amount?: number
  method?: string // "online" | "manual"
  provider?: string // "neero" | "manual" | "none"
  status?: string // "pending" | "successful" | "failed" | "cancelled" | "refunded"
  createdAt?: string
  settledAt?: string
  classFriendlyId?: string
  userFriendlyId?: string
  manualNote?: string
  gatewayReference?: string
  gatewayPaymentRef?: string
  gatewayPayload?: Record<string, unknown> | null
  userId?: ApiUserRef | string | null
  classId?: ApiClassRef | string | null
}

/** /staff/payments renvoie un resultat mongoose-paginate ou un tableau. */
type ApiPaymentPage = { docs?: ApiStaffPayment[]; totalPages?: number; page?: number } | ApiStaffPayment[]

export type StaffPaymentsQuery = {
  userId?: string
  classId?: string
  status?: string
  method?: string
}

const PAGE_SIZE = 100
const MAX_PAGES = 50

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Determine l'operateur (MTN/Orange) a partir du payload passerelle Neero. */
function operatorFromPayload(payload: ApiStaffPayment["gatewayPayload"]): "MTN" | "Orange" | null {
  const root = asRecord(payload)
  const source = asRecord(root?.sourcePaymentMethodDetails)
  const mobile = asRecord(source?.mobileMoneyDetails)
  const candidate =
    (typeof mobile?.mobileMoneyProvider === "string" ? mobile.mobileMoneyProvider : undefined) ??
    (typeof source?.walletTypeProductName === "string" ? source.walletTypeProductName : undefined)
  if (typeof candidate !== "string") return null
  const upper = candidate.toUpperCase()
  if (upper.includes("ORANGE")) return "Orange"
  if (upper.includes("MTN")) return "MTN"
  return null
}

function refField<T extends ApiUserRef | ApiClassRef>(ref: T | string | null | undefined): T | null {
  if (!ref || typeof ref === "string") return null
  return ref as T
}

/**
 * Mappe un paiement backend vers l'AdminPaymentItem attendu par l'UI.
 * Renvoie null pour les paiements echoues/annules/rembourses (non affiches dans
 * l'historique standard pour rester aligne avec les statuts de l'UI).
 */
function mapApiPaymentToAdminItem(raw: ApiStaffPayment): AdminPaymentItem | null {
  const status = (raw.status ?? "").toLowerCase()
  if (status === "failed" || status === "cancelled" || status === "refunded") return null

  const user = refField<ApiUserRef>(raw.userId)
  const cls = refField<ApiClassRef>(raw.classId)
  const isManual = raw.method === "manual"

  const method: AdminPaymentItem["method"] = isManual
    ? "Especes"
    : (operatorFromPayload(raw.gatewayPayload) ?? "MTN")

  const uiStatus: AdminPaymentItem["status"] =
    status === "successful" ? (isManual ? "manual" : "success") : "pending"

  return {
    id: raw.paymentId ?? "",
    operatorReference: raw.gatewayReference ?? raw.gatewayPaymentRef ?? undefined,
    learnerId: user?.userId ?? raw.userFriendlyId,
    classId: cls?.classId ?? raw.classFriendlyId,
    learnerName: user?.name ?? raw.userFriendlyId ?? "",
    className: cls?.title ?? raw.classFriendlyId ?? "",
    amount: raw.amount ?? 0,
    method,
    createdAt: raw.settledAt ?? raw.createdAt ?? new Date().toISOString(),
    status: uiStatus,
    note: raw.manualNote || undefined,
  }
}

/**
 * Recupere les paiements cote staff/admin via GET /staff/payments (pagine).
 * Les filtres optionnels (userId, classId, status, method) sont transmis tels quels.
 */
export async function fetchStaffPayments(query: StaffPaymentsQuery = {}): Promise<AdminPaymentItem[]> {
  const items: AdminPaymentItem[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<ApiPaymentPage>("/staff/payments", {
      method: "GET",
      query: {
        pageNum,
        pageSize: PAGE_SIZE,
        userId: query.userId,
        classId: query.classId,
        status: query.status,
        method: query.method,
      },
    })

    const docs = Array.isArray(data) ? data : (data?.docs ?? [])
    for (const doc of docs) {
      const mapped = mapApiPaymentToAdminItem(doc)
      if (mapped) items.push(mapped)
    }

    const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1)
    if (docs.length < PAGE_SIZE || pageNum >= totalPages) break
    pageNum += 1
  }

  return items
}

/** Option de paiement réclamable (v4) : statut non validé (pending/failed). */
export type ClaimablePaymentOption = {
  id: string
  amount: number
  status: "pending" | "failed"
  createdAt: string
}

/**
 * Paiements réclamables d'un apprenant pour résoudre une réclamation (contrat v4) :
 * uniquement les paiements `pending` ou `failed` (les `successful` sont déjà validés,
 * `cancelled`/`refunded` ne sont pas réclamables). Contrairement à fetchStaffPayments,
 * cette fonction conserve les paiements `failed`.
 */
export async function fetchClaimablePaymentsForUser(userId: string): Promise<ClaimablePaymentOption[]> {
  const items: ClaimablePaymentOption[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<ApiPaymentPage>("/staff/payments", {
      method: "GET",
      query: { pageNum, pageSize: PAGE_SIZE, userId },
    })

    const docs = Array.isArray(data) ? data : (data?.docs ?? [])
    for (const doc of docs) {
      const status = (doc.status ?? "").toLowerCase()
      if (status !== "pending" && status !== "failed") continue
      items.push({
        id: doc.paymentId ?? "",
        amount: doc.amount ?? 0,
        status: status as "pending" | "failed",
        createdAt: doc.settledAt ?? doc.createdAt ?? new Date().toISOString(),
      })
    }

    const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1)
    if (docs.length < PAGE_SIZE || pageNum >= totalPages) break
    pageNum += 1
  }

  return items
}

/** Detail d'un paiement via GET /staff/payments/:id. */
export async function getStaffPaymentById(paymentId: string): Promise<AdminPaymentItem | null> {
  const data = await apiRequest<{ payment?: ApiStaffPayment } | ApiStaffPayment>(
    `/staff/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
  )
  const raw = (data as { payment?: ApiStaffPayment }).payment ?? (data as ApiStaffPayment)
  return mapApiPaymentToAdminItem(raw)
}

export type RecordManualPaymentInput = {
  userId: string // friendly user id
  classId: string // friendly class id
  amount: number
  note?: string
}

/**
 * Enregistre un paiement manuel (especes/guichet) via POST /staff/payments/manual.
 * Le back-end refuse tout depassement du reste a payer ; on normalise alors
 * l'erreur en "OVERPAY" pour l'affichage cote UI.
 */
export async function recordManualPayment(
  input: RecordManualPaymentInput,
): Promise<AdminPaymentItem | null> {
  try {
    const data = await apiRequest<{ payment?: ApiStaffPayment }>("/staff/payments/manual", {
      method: "POST",
      body: {
        userId: input.userId,
        classId: input.classId,
        amount: Math.round(input.amount),
        note: input.note,
      },
    })
    const mapped = data?.payment ? mapApiPaymentToAdminItem(data.payment) : null
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("admin-payments-updated"))
    }
    return mapped
  } catch (error) {
    if (error instanceof ApiClientError) {
      const payload = error.payload as Record<string, unknown> | undefined
      const code = String(payload?.code ?? payload?.errorCode ?? payload?.message ?? "").toUpperCase()
      if (code.includes("EXCEED") || code.includes("FULLY_PAID") || code.includes("REMAINING")) {
        throw new Error("OVERPAY")
      }
    }
    throw error
  }
}
