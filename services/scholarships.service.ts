"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import { notifyAdminPaymentsUpdated } from "@/lib/admin-data-events"

export type ScholarshipType = "full" | "fixed" | "percentage"

export type ScholarshipPublic = {
  scholarshipId: string
  type: ScholarshipType
  value: number
  discount: number
  isFull: boolean
  reason?: string
  grantedAt?: string
}

export type ClassPaymentSummary = {
  catalogExpected: number
  scholarshipDiscount: number
  expected: number
  paid: number
  pending: number
  remaining: number
  fullyPaid: boolean
  scholarship: ScholarshipPublic | null
}

export type GrantScholarshipInput = {
  userId: string
  classId: string
  type: ScholarshipType
  value?: number
  reason?: string
  note?: string
}

export async function fetchClassPaymentSummary(
  userId: string,
  classId: string,
): Promise<ClassPaymentSummary | null> {
  try {
    const data = await apiRequest<{ summary?: ClassPaymentSummary }>("/staff/payments/class-summary", {
      method: "GET",
      query: { userId, classId },
    })
    return data?.summary ?? null
  } catch {
    return null
  }
}

export async function grantScholarship(input: GrantScholarshipInput): Promise<void> {
  const body: Record<string, unknown> = {
    userId: input.userId,
    classId: input.classId,
    type: input.type,
    reason: input.reason,
    note: input.note,
  }
  if (input.type !== "full" && input.value != null) {
    body.value = Math.round(input.value)
  }
  await apiRequest("/staff/scholarships", { method: "POST", body })
  notifyAdminPaymentsUpdated()
}

export async function revokeScholarship(scholarshipId: string): Promise<void> {
  await apiRequest(`/staff/scholarships/${scholarshipId}/revoke`, { method: "PATCH" })
  notifyAdminPaymentsUpdated()
}

export type ActiveScholarshipRecord = {
  scholarshipId: string
  userId: string
  classId: string
  type: ScholarshipType
  value: number
  isFull: boolean
}

type ApiScholarshipRow = {
  scholarshipId?: string
  userFriendlyId?: string
  classFriendlyId?: string
  type?: ScholarshipType
  value?: number
  userId?: { userId?: string } | string
  classId?: { classId?: string } | string
}

type ApiScholarshipPage = { docs?: ApiScholarshipRow[]; totalPages?: number; page?: number }

const SCHOLARSHIP_PAGE_SIZE = 100
const SCHOLARSHIP_MAX_PAGES = 50

function resolveScholarshipUserId(row: ApiScholarshipRow): string {
  if (typeof row.userFriendlyId === "string" && row.userFriendlyId.trim()) return row.userFriendlyId.trim()
  const ref = row.userId
  if (ref && typeof ref === "object" && typeof ref.userId === "string") return ref.userId.trim()
  return ""
}

function resolveScholarshipClassId(row: ApiScholarshipRow): string {
  if (typeof row.classFriendlyId === "string" && row.classFriendlyId.trim()) return row.classFriendlyId.trim()
  const ref = row.classId
  if (ref && typeof ref === "object" && typeof ref.classId === "string") return ref.classId.trim()
  return ""
}

export async function fetchActiveScholarships(): Promise<ActiveScholarshipRecord[]> {
  const rows: ActiveScholarshipRecord[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= SCHOLARSHIP_MAX_PAGES) {
    const data = await apiRequest<ApiScholarshipPage>("/staff/scholarships", {
      method: "GET",
      query: { isActive: "true", page, limit: SCHOLARSHIP_PAGE_SIZE },
    })

    const docs = Array.isArray(data) ? data : (data.docs ?? [])
    totalPages = Array.isArray(data) ? 1 : Math.max(1, data.totalPages ?? 1)

    for (const row of docs) {
      const userId = resolveScholarshipUserId(row)
      const classId = resolveScholarshipClassId(row)
      const type = row.type ?? "full"
      if (!userId || !row.scholarshipId) continue
      rows.push({
        scholarshipId: row.scholarshipId,
        userId,
        classId,
        type,
        value: Number(row.value) || 0,
        isFull: type === "full",
      })
    }

    page += 1
  }

  return rows
}

export function scholarshipErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const payload = error.payload as Record<string, unknown> | undefined
    const msg = payload?.errorMsg
    if (typeof msg === "string" && msg.trim()) return msg.trim()
  }
  if (error instanceof Error && error.message) return error.message
  return "Une erreur est survenue."
}
