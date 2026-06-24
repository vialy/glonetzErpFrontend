import { deriveClassSession } from "@/lib/class-session"
import type {
  CreateStaffClassInput,
  StaffClass,
  StaffClassDetails,
  StaffClassStatus,
} from "@/domains/classes/types"

function defaultChart(base: number) {
  return ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin"].map((label, i) => ({
    label,
    paid: Math.round(base + i * 8000),
  }))
}

function mapStatus(value: unknown): StaffClassStatus {
  const normalized = String(value ?? "active").toLowerCase()
  if (normalized === "finished" || normalized === "completed" || normalized === "done") return "finished"
  if (normalized === "archived" || normalized === "inactive") return "archived"
  return "active"
}

function pickClassRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {}
  const record = data as Record<string, unknown>
  if (record.class && typeof record.class === "object") {
    return record.class as Record<string, unknown>
  }
  return record
}

const LIST_KEYS = [
  "items",
  "classes",
  "content",
  "records",
  "list",
  "rows",
  "results",
  "result",
  "data",
  "pageData",
  "resultData",
] as const

function looksLikeClassRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Boolean(
    record.classId ??
      record.id ??
      record.friendlyId ??
      record.title ??
      record.name ??
      record.startDate ??
      record.periodStart,
  )
}

function extractClassArray(data: unknown, depth = 0): unknown[] {
  if (Array.isArray(data)) {
    return data.length === 0 || looksLikeClassRecord(data[0]) ? data : []
  }
  if (!data || typeof data !== "object" || depth > 4) return []

  const record = data as Record<string, unknown>

  for (const key of LIST_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === "object") {
      const nested = extractClassArray(value, depth + 1)
      if (nested.length > 0) return nested
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && (value.length === 0 || looksLikeClassRecord(value[0]))) {
      return value
    }
  }

  return []
}

export function mapApiClassToStaffClass(
  data: unknown,
  locale: "fr" | "en" = "fr",
): StaffClass {
  const record = pickClassRecord(data)
  const periodStart = String(record.startDate ?? record.periodStart ?? record.start ?? "")
  const periodEnd = String(record.endDate ?? record.periodEnd ?? record.end ?? "")
  const tuitionAmount = Math.round(Number(record.fee ?? record.tuitionAmount ?? record.amount ?? 0))
  const baseChart = Math.max(15_000, Math.round(tuitionAmount * 0.25))

  return {
    id: String(record.classId ?? record.id ?? record.friendlyId ?? record._id ?? ""),
    name: String(record.title ?? record.name ?? record.className ?? ""),
    description: String(record.description ?? ""),
    session:
      String(record.session ?? "").trim() ||
      deriveClassSession(periodStart, periodEnd, locale),
    periodStart,
    periodEnd,
    status: mapStatus(record.status),
    learnersCount: Number(
      record.learnersCount ??
        record.learnerCount ??
        record.studentsCount ??
        record.studentCount ??
        record.enrolledCount ??
        record.usersCount ??
        record.membersCount ??
        0,
    ),
    tuitionAmount,
    totalDue: Number(record.totalDue ?? record.dueTotal ?? record.expected ?? 0),
    totalPaid: Number(record.totalPaid ?? record.paidTotal ?? record.paid ?? 0),
    chartData: Array.isArray(record.chartData) && record.chartData.length > 0
      ? (record.chartData as StaffClass["chartData"])
      : defaultChart(baseChart),
  }
}

export function parseStaffClassList(data: unknown, locale: "fr" | "en" = "fr"): StaffClass[] {
  return extractClassArray(data)
    .map((item) => mapApiClassToStaffClass(item, locale))
    .filter((item) => item.id.trim().length > 0)
}

export function parseStaffClass(data: unknown, locale: "fr" | "en" = "fr"): StaffClass {
  const mapped = mapApiClassToStaffClass(data, locale)
  if (!mapped.id.trim()) {
    throw new Error("INVALID_CLASS_RESPONSE")
  }
  return mapped
}

/**
 * Parse GET /staff/classes/:id/details — { class, stats }.
 * Le rollup financier (du/paye/reste) est calcule cote serveur, plafonne par
 * etudiant a `fee` et limite aux etudiants actuellement assignes a la classe.
 */
export function parseStaffClassDetails(data: unknown, locale: "fr" | "en" = "fr"): StaffClassDetails {
  const cls = parseStaffClass(data, locale)
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const statsRecord =
    root.stats && typeof root.stats === "object" ? (root.stats as Record<string, unknown>) : {}
  const num = (value: unknown) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return {
    class: cls,
    stats: {
      studentCount: num(statsRecord.studentCount ?? statsRecord.studentsCount ?? cls.learnersCount),
      fullyPaidCount: num(statsRecord.fullyPaidCount),
      partiallyPaidCount: num(statsRecord.partiallyPaidCount),
      unpaidCount: num(statsRecord.unpaidCount),
      totalExpected: num(statsRecord.totalExpected ?? statsRecord.expected ?? statsRecord.totalDue),
      totalPaid: num(statsRecord.totalPaid ?? statsRecord.paid),
      totalRemaining: num(statsRecord.totalRemaining ?? statsRecord.remaining),
      currencyCode:
        typeof statsRecord.currencyCode === "string" ? statsRecord.currencyCode : undefined,
    },
  }
}

export function toCreateClassBody(input: CreateStaffClassInput) {
  return {
    title: input.name.trim(),
    description: input.description?.trim() || undefined,
    startDate: input.periodStart,
    endDate: input.periodEnd,
    fee: Math.round(input.tuitionAmount),
    currencyCode: "XAF",
  }
}
