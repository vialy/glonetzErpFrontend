import { deriveClassSession } from "@/lib/class-session"
import { isClassLevel, isClassTimeSlot, inferClassLevelFromName, type ClassLevel, type ClassTimeSlot } from "@/lib/class-metadata"
import type {
  CreateStaffClassInput,
  StaffClass,
  StaffClassDetails,
  StaffClassStatus,
  UpdateStaffClassInput,
} from "@/domains/classes/types"

function defaultChart(base: number) {
  return ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin"].map((label, i) => ({
    label,
    paid: Math.round(base + i * 8000),
  }))
}

function mapLevel(value: unknown, title?: string): ClassLevel {
  const raw = String(value ?? "").toUpperCase()
  if (isClassLevel(raw)) return raw
  if (title) {
    const inferred = inferClassLevelFromName(title)
    if (inferred) return inferred
  }
  return "A1"
}

function mapTimeSlot(value: unknown): ClassTimeSlot {
  const raw = String(value ?? "MO").toUpperCase()
  return isClassTimeSlot(raw) ? raw : "MO"
}

function mapStatus(value: unknown, isActive?: unknown): StaffClassStatus {
  const normalized = String(value ?? "").toLowerCase()
  if (normalized === "finished" || normalized === "completed" || normalized === "done") return "finished"
  if (normalized === "archived" || normalized === "inactive") return "archived"
  if (normalized === "active") return "active"
  if (isActive === false) return "archived"
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
  const name = String(record.title ?? record.name ?? record.className ?? "")
  const tuitionAmount = Math.round(Number(record.fee ?? record.tuitionAmount ?? record.amount ?? 0))
  const baseChart = Math.max(15_000, Math.round(tuitionAmount * 0.25))

  return {
    id: String(record.classId ?? record.id ?? record.friendlyId ?? record._id ?? ""),
    name,
    description: String(record.description ?? ""),
    level: mapLevel(record.level, name),
    timeSlot: mapTimeSlot(record.timeSlot),
    session:
      String(record.session ?? "").trim() ||
      deriveClassSession(periodStart, periodEnd, locale),
    periodStart,
    periodEnd,
    status: mapStatus(record.status, record.isActive),
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
 *
 * Le back-end renvoie stats.current (effectif actuel) et stats.session
 * (historique ClassEnrollment + encaisse total). Les champs plats legacy
 * sont conservés pour les clients existants.
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

  const parseCurrentBlock = (record: Record<string, unknown>) => ({
    studentCount: num(record.studentCount ?? record.studentsCount ?? cls.learnersCount),
    fullyPaidCount: num(record.fullyPaidCount),
    partiallyPaidCount: num(record.partiallyPaidCount),
    unpaidCount: num(record.unpaidCount),
    catalogExpected: num(record.catalogExpected ?? record.totalExpected ?? record.expected ?? record.totalDue),
    netExpected: num(record.netExpected ?? record.totalExpected ?? record.expected ?? record.totalDue),
    totalScholarship: num(record.totalScholarship),
    scholarshipCount: num(record.scholarshipCount),
    scholarshipFullCount: num(record.scholarshipFullCount),
    totalExpected: num(record.totalExpected ?? record.expected ?? record.totalDue),
    totalPaid: num(record.totalPaid ?? record.paid),
    totalRemaining: num(record.totalRemaining ?? record.remaining),
  })

  const parseSessionBlock = (record: Record<string, unknown>) => ({
    enrollmentCount: num(record.enrollmentCount),
    studentCount: num(record.studentCount ?? record.studentsCount),
    leftCount: num(record.leftCount),
    totalExpected: num(record.totalExpected ?? record.expected),
    totalPaid: num(record.totalPaid ?? record.paid),
    totalRemaining: num(record.totalRemaining ?? record.remaining),
  })

  const hasCurrent = statsRecord.current && typeof statsRecord.current === "object"
  const hasSession = statsRecord.session && typeof statsRecord.session === "object"

  const current = hasCurrent
    ? parseCurrentBlock(statsRecord.current as Record<string, unknown>)
    : parseCurrentBlock(statsRecord)

  const session = hasSession
    ? parseSessionBlock(statsRecord.session as Record<string, unknown>)
    : {
        enrollmentCount: current.studentCount,
        studentCount: current.studentCount,
        leftCount: 0,
        totalExpected: current.totalExpected,
        totalPaid: num(statsRecord.totalPaid ?? current.totalPaid),
        totalRemaining: Math.max(
          0,
          current.totalExpected - num(statsRecord.totalPaid ?? current.totalPaid),
        ),
      }

  const currencyCode =
    typeof statsRecord.currencyCode === "string" ? statsRecord.currencyCode : undefined

  return {
    class: cls,
    stats: {
      currencyCode,
      current,
      session,
      // Legacy (flat) — studentCount/totalExpected/totalRemaining = current ; totalPaid = session.
      studentCount: current.studentCount,
      fullyPaidCount: current.fullyPaidCount,
      partiallyPaidCount: current.partiallyPaidCount,
      unpaidCount: current.unpaidCount,
      totalExpected: current.totalExpected,
      totalPaid: session.totalPaid,
      totalRemaining: current.totalRemaining,
    },
  }
}

export function toCreateClassBody(input: CreateStaffClassInput) {
  return {
    title: input.name.trim(),
    description: input.description?.trim() || undefined,
    level: input.level,
    timeSlot: input.timeSlot,
    startDate: input.periodStart,
    endDate: input.periodEnd,
    fee: Math.round(input.tuitionAmount),
    currencyCode: "XAF",
  }
}

export function toUpdateClassBody(input: UpdateStaffClassInput) {
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.title = input.name.trim()
  if (input.description !== undefined) body.description = input.description.trim()
  if (input.level !== undefined) body.level = input.level
  if (input.timeSlot !== undefined) body.timeSlot = input.timeSlot
  if (input.periodStart !== undefined) body.startDate = input.periodStart
  if (input.periodEnd !== undefined) body.endDate = input.periodEnd
  if (input.tuitionAmount !== undefined) body.fee = Math.round(input.tuitionAmount)
  return body
}
