"use client"

import { apiRequest } from "@/core/api/client"
import type { ClaimRecord, ClaimStatus } from "@/domains/claims/types"

/** Forme brute d'une reclamation renvoyee par GET /staff/claims (userId peuple). */
type ApiUserRef = { userId?: string; name?: string; email?: string; phone?: string }

type ApiStaffClaim = {
  claimId?: string
  userId?: ApiUserRef | string | null
  userFriendlyId?: string
  amount?: number
  currencyCode?: string
  description?: string
  paymentDate?: string
  proofUrl?: string
  status?: string // "pending" | "successful" | "failed"
  resolvedPaymentId?: string
  resolutionNote?: string
  createdAt?: string
}

type ApiClaimPage = { docs?: ApiStaffClaim[]; totalPages?: number; page?: number } | ApiStaffClaim[]

export type StaffClaimsQuery = { status?: "pending" | "successful" | "failed" }

const PAGE_SIZE = 100
const MAX_PAGES = 50

function refUser(ref: ApiStaffClaim["userId"]): ApiUserRef | null {
  if (!ref || typeof ref === "string") return null
  return ref
}

/**
 * Reconstruit l'URL de la preuve sur l'API réellement utilisée.
 * Le back-end génère proofUrl avec son APP_BASE_URL (souvent http://localhost:4000
 * en dev) : on ré-ancre toujours le chemin du fichier sur NEXT_PUBLIC_API_BASE_URL
 * pour que l'image se charge depuis le bon hôte (les uploads sont servis par l'API).
 */
function absoluteUrl(url?: string): string | undefined {
  if (!url) return undefined
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  if (!base) return url
  try {
    const parsed = new URL(url)
    return `${base}${parsed.pathname}${parsed.search}`
  } catch {
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`
  }
}

/** Mappe le statut back-end (pending/successful/failed) vers le statut UI existant. */
function mapStatus(status: string | undefined): ClaimStatus {
  switch ((status ?? "").toLowerCase()) {
    case "successful":
      return "resolue"
    case "failed":
      return "rejetee"
    default:
      return "en_attente"
  }
}

function mapApiClaim(raw: ApiStaffClaim): ClaimRecord {
  const user = refUser(raw.userId)
  const proof = absoluteUrl(raw.proofUrl)
  return {
    id: raw.claimId ?? "",
    createdAt: raw.createdAt ?? raw.paymentDate ?? new Date().toISOString(),
    amount: raw.amount ?? 0,
    // Le back-end ne stocke pas l'operateur sur la reclamation : valeur par defaut.
    paymentMethod: "mtn_momo",
    phoneNumber: user?.phone ?? "",
    transactionReference: raw.resolvedPaymentId ?? "",
    description: raw.description ?? "",
    screenshotDataUrl: proof,
    screenshotName: proof ? proof.split("/").pop() || "preuve" : undefined,
    status: mapStatus(raw.status),
    userId: user?.userId ?? raw.userFriendlyId,
    userName: user?.name,
    proofUrl: proof,
  }
}

export async function fetchStaffClaims(query: StaffClaimsQuery = {}): Promise<ClaimRecord[]> {
  const items: ClaimRecord[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<ApiClaimPage>("/staff/claims", {
      method: "GET",
      query: { pageNum, pageSize: PAGE_SIZE, status: query.status },
    })

    const docs = Array.isArray(data) ? data : (data?.docs ?? [])
    for (const doc of docs) items.push(mapApiClaim(doc))

    const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1)
    if (docs.length < PAGE_SIZE || pageNum >= totalPages) break
    pageNum += 1
  }

  return items
}

export type ResolveStaffClaimInput = {
  status: "successful" | "failed"
  paymentId: string // friendly id du paiement sous-jacent (requis par le back-end)
  resolutionNote?: string
}

/** POST /staff/claims/:id/resolve — lie la reclamation a un paiement et synchronise son statut. */
export async function resolveStaffClaim(
  claimId: string,
  input: ResolveStaffClaimInput,
): Promise<void> {
  await apiRequest<unknown>(`/staff/claims/${encodeURIComponent(claimId)}/resolve`, {
    method: "POST",
    body: {
      status: input.status,
      paymentId: input.paymentId,
      resolutionNote: input.resolutionNote,
    },
  })
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("claims-updated"))
    window.dispatchEvent(new Event("admin-payments-updated"))
  }
}
