import type { CreateStaffLearnerInput, StaffLearner, StaffLearnerStatus } from "@/domains/learners/types"

function mapStatus(value: unknown): StaffLearnerStatus {
  const normalized = String(value ?? "active").toLowerCase()
  if (normalized === "suspended" || normalized === "inactive" || normalized === "disabled") {
    return "suspended"
  }
  return "active"
}

/**
 * Le back-end exprime l'etat du compte via le booleen `isActive` (et non un champ
 * `status`). On le prend en priorite, puis on retombe sur un eventuel `status`.
 */
function resolveLearnerStatus(record: Record<string, unknown>): StaffLearnerStatus {
  if (record.isActive === false || record.active === false || record.disabled === true) {
    return "suspended"
  }
  if (record.isActive === true || record.active === true) {
    return "active"
  }
  return mapStatus(record.status)
}

function pickUserRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {}
  const record = data as Record<string, unknown>
  if (record.user && typeof record.user === "object") {
    return record.user as Record<string, unknown>
  }
  if (record.learner && typeof record.learner === "object") {
    return record.learner as Record<string, unknown>
  }
  if (record.createdUser && typeof record.createdUser === "object") {
    return record.createdUser as Record<string, unknown>
  }
  if (record.newUser && typeof record.newUser === "object") {
    return record.newUser as Record<string, unknown>
  }
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return pickUserRecord(record.data)
  }
  return record
}

const LIST_KEYS = [
  "items",
  "users",
  "learners",
  "students",
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

function looksLikeUserRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Boolean(
    record.userId ??
      record.userFriendlyId ??
      record.friendlyId ??
      record.id ??
      record.phone ??
      record.name ??
      record.fullName,
  )
}

function extractUserArray(data: unknown, depth = 0): unknown[] {
  if (Array.isArray(data)) {
    return data.length === 0 || looksLikeUserRecord(data[0]) ? data : []
  }
  if (!data || typeof data !== "object" || depth > 4) return []

  const record = data as Record<string, unknown>

  for (const key of LIST_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === "object") {
      const nested = extractUserArray(value, depth + 1)
      if (nested.length > 0) return nested
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && (value.length === 0 || looksLikeUserRecord(value[0]))) {
      return value
    }
  }

  return []
}

function resolveNestedClass(record: Record<string, unknown>): Record<string, unknown> | null {
  const classRef = record.class ?? record.classInfo ?? record.enrolledClass
  if (classRef && typeof classRef === "object" && !Array.isArray(classRef)) {
    return classRef as Record<string, unknown>
  }
  if (record.classId && typeof record.classId === "object" && !Array.isArray(record.classId)) {
    return record.classId as Record<string, unknown>
  }
  return null
}

function resolveClassId(record: Record<string, unknown>, classRecord: Record<string, unknown> | null): string {
  if (typeof record.classId === "string") return record.classId.trim()
  if (typeof record.classFriendlyId === "string") return record.classFriendlyId.trim()
  if (classRecord) {
    return String(classRecord.classId ?? classRecord.friendlyId ?? classRecord.id ?? "").trim()
  }
  return ""
}

function resolveClassName(classRecord: Record<string, unknown> | null, record: Record<string, unknown>): string {
  if (classRecord) {
    return String(classRecord.title ?? classRecord.name ?? classRecord.className ?? "").trim()
  }
  if (typeof record.className === "string") return record.className.trim()
  return ""
}

function resolvePaymentSummary(record: Record<string, unknown>): Record<string, unknown> | null {
  for (const key of ["classSummary", "paymentSummary", "financials", "payments", "balance"]) {
    const value = record[key]
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return null
}

function formatDateOfBirth(value: unknown): string {
  if (!value) return ""
  const raw = value instanceof Date ? value.toISOString() : String(value)
  return raw.length >= 10 ? raw.slice(0, 10) : raw
}

export function mapApiUserToStaffLearner(data: unknown): StaffLearner {
  const record = pickUserRecord(data)
  const classRecord = resolveNestedClass(record)
  const classId = resolveClassId(record, classRecord)
  const className = resolveClassName(classRecord, record)
  const paymentSummary = resolvePaymentSummary(record)

  const classFee = Number(classRecord?.fee ?? classRecord?.tuitionAmount ?? classRecord?.amount ?? 0)

  const due = Number(
    paymentSummary?.expected ??
      paymentSummary?.totalDue ??
      paymentSummary?.due ??
      paymentSummary?.amountDue ??
      record.due ??
      record.totalDue ??
      record.amountDue ??
      record.expected ??
      record.tuition ??
      classFee ??
      0,
  )
  const paid = Number(
    paymentSummary?.totalPaid ??
      paymentSummary?.paid ??
      paymentSummary?.amountPaid ??
      record.paid ??
      record.totalPaid ??
      record.amountPaid ??
      record.paidAmount ??
      0,
  )

  return {
    id: String(
      record.userFriendlyId ??
        record.friendlyId ??
        record.userId ??
        record.id ??
        record._id ??
        record.uid ??
        "",
    ),
    fullName: String(record.name ?? record.fullName ?? record.userName ?? ""),
    phone: String(record.phone ?? record.phoneNumber ?? ""),
    email: record.email ? String(record.email) : undefined,
    classId,
    className: className || undefined,
    createdAt: String(record.createdAt ?? record.created ?? record.registeredAt ?? new Date().toISOString()),
    dateOfBirth: formatDateOfBirth(record.dateOfBirth ?? record.dob ?? record.birthDate),
    placeOfBirth: String(record.placeOfBirth ?? record.birthPlace ?? ""),
    pinInitialized: Boolean(
      record.pinInitialized ?? record.passwordInitialized ?? record.credentialsSent ?? true,
    ),
    mustChangePin: Boolean(
      record.mustChangePin ?? record.mustChangePassword ?? record.requiresPasswordChange ?? false,
    ),
    status: resolveLearnerStatus(record),
    due,
    paid,
  }
}

export function parseStaffLearnerList(data: unknown): StaffLearner[] {
  return extractUserArray(data)
    .map((item) => mapApiUserToStaffLearner(item))
    .filter((item) => item.id.trim().length > 0)
}

export function parseStaffLearner(data: unknown): StaffLearner {
  const mapped = mapApiUserToStaffLearner(data)
  if (!mapped.id.trim()) {
    throw new Error("INVALID_LEARNER_RESPONSE")
  }
  return mapped
}

function normalizePhoneDigits(value: string) {
  return value.replace(/[^\d]/g, "")
}

export function learnerFromCreateFallback(
  input: CreateStaffLearnerInput,
  data?: unknown,
): StaffLearner {
  try {
    const mapped = mapApiUserToStaffLearner(data ?? {})
    if (mapped.id.trim()) return mapped
  } catch {
    // ignore
  }

  return {
    id: `pending-${Date.now()}`,
    fullName: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    classId: input.classId,
    createdAt: new Date().toISOString(),
    dateOfBirth: input.dateOfBirth?.slice(0, 10) ?? "",
    placeOfBirth: input.placeOfBirth?.trim() ?? "",
    pinInitialized: true,
    mustChangePin: true,
    status: "active",
    due: 0,
    paid: 0,
  }
}

export function findLearnerByPhone(list: StaffLearner[], phone: string): StaffLearner | undefined {
  const needle = normalizePhoneDigits(phone)
  if (!needle) return undefined
  return list.find((item) => normalizePhoneDigits(item.phone) === needle)
}

export function toCreateLearnerBody(input: CreateStaffLearnerInput) {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    classId: input.classId,
  }
  const email = input.email?.trim()
  if (email) body.email = email
  if (input.dateOfBirth?.trim()) body.dateOfBirth = input.dateOfBirth.trim().slice(0, 10)
  if (input.placeOfBirth?.trim()) body.placeOfBirth = input.placeOfBirth.trim()
  return body
}

export function toUpdateLearnerBody(input: {
  name?: string
  email?: string
  dateOfBirth?: string
  placeOfBirth?: string
}) {
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.name = input.name.trim()
  if (input.email !== undefined) body.email = input.email.trim() || undefined
  if (input.dateOfBirth !== undefined) body.dateOfBirth = input.dateOfBirth.trim().slice(0, 10) || null
  if (input.placeOfBirth !== undefined) body.placeOfBirth = input.placeOfBirth.trim() || null
  return body
}
