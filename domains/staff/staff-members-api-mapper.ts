import {
  STAFF_ROLE_TO_CODE,
  type CreateStaffMemberInput,
  type StaffMember,
  type StaffRole,
  type UpdateStaffMemberInput,
} from "@/domains/staff/types"

const ROLE_FROM_CODE: Record<number, StaffRole> = {
  1000: "admin",
  600: "manager",
  500: "accountant",
  400: "accountant",
  300: "accountant",
  200: "collaborateur",
}

/** Normalizes a backend role (numeric code or string) into a UI role. */
export function mapStaffRole(value: unknown): StaffRole {
  if (typeof value === "number") return ROLE_FROM_CODE[value] ?? "collaborateur"
  const normalized = String(value ?? "").toLowerCase().trim()
  if (normalized === "admin" || normalized === "administrator") return "admin"
  if (normalized === "manager") return "manager"
  if (normalized === "accountant" || normalized === "comptable" || normalized === "auditor") {
    return "accountant"
  }
  if (normalized === "collaborateur" || normalized === "collaborator" || normalized === "support") {
    return "collaborateur"
  }
  return "collaborateur"
}

function pickStaffRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {}
  const record = data as Record<string, unknown>
  if (record.staff && typeof record.staff === "object") {
    return record.staff as Record<string, unknown>
  }
  if (record.member && typeof record.member === "object") {
    return record.member as Record<string, unknown>
  }
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return pickStaffRecord(record.data)
  }
  return record
}

function looksLikeStaffRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Boolean(record.staffId ?? record.email ?? record.name ?? record.role ?? record.id)
}

const LIST_KEYS = ["docs", "items", "staff", "members", "users", "results", "data", "rows"] as const

function extractStaffArray(data: unknown, depth = 0): unknown[] {
  if (Array.isArray(data)) {
    return data.length === 0 || looksLikeStaffRecord(data[0]) ? data : []
  }
  if (!data || typeof data !== "object" || depth > 4) return []
  const record = data as Record<string, unknown>
  for (const key of LIST_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === "object") {
      const nested = extractStaffArray(value, depth + 1)
      if (nested.length > 0) return nested
    }
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && (value.length === 0 || looksLikeStaffRecord(value[0]))) {
      return value
    }
  }
  return []
}

export function mapApiStaffMember(data: unknown): StaffMember {
  const record = pickStaffRecord(data)
  const isActive = record.isActive
  const hasChangedPassword = record.hsCp ?? record.hasChangedPassword
  return {
    id: String(record.staffId ?? record.friendlyId ?? record.id ?? record._id ?? ""),
    fullName: String(record.name ?? record.fullName ?? ""),
    email: String(record.email ?? ""),
    role: mapStaffRole(record.role),
    status: isActive === false ? "inactive" : "active",
    mustChangePassword: Boolean(
      record.mustChangePassword ?? record.requiresPasswordChange ?? hasChangedPassword === false,
    ),
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
  }
}

export function parseStaffMember(data: unknown): StaffMember {
  const mapped = mapApiStaffMember(data)
  if (!mapped.id.trim()) throw new Error("INVALID_STAFF_RESPONSE")
  return mapped
}

function readCredentialsEmailSent(data: unknown): boolean {
  if (!data || typeof data !== "object") return true
  const record = data as Record<string, unknown>
  if (typeof record.credentialsEmailSent === "boolean") return record.credentialsEmailSent
  if (record.data && typeof record.data === "object") {
    return readCredentialsEmailSent(record.data)
  }
  return true
}

export function parseStaffCreateResponse(data: unknown): {
  member: StaffMember
  credentialsEmailSent: boolean
} {
  return {
    member: parseStaffMember(data),
    credentialsEmailSent: readCredentialsEmailSent(data),
  }
}

export function parseStaffRegeneratePasswordResponse(data: unknown): {
  credentialsEmailSent: boolean
} {
  return { credentialsEmailSent: readCredentialsEmailSent(data) }
}

export function parseStaffMemberList(data: unknown): StaffMember[] {
  return extractStaffArray(data)
    .map((item) => mapApiStaffMember(item))
    .filter((item) => item.id.trim().length > 0)
}

export function staffMemberFromCreateFallback(input: CreateStaffMemberInput, data?: unknown): StaffMember {
  try {
    const mapped = mapApiStaffMember(data ?? {})
    if (mapped.id.trim()) return mapped
  } catch {
    // ignore — fall back to the submitted input below
  }
  return {
    id: `pending-${Date.now()}`,
    fullName: input.name.trim(),
    email: input.email.trim(),
    role: input.role,
    status: "active",
    mustChangePassword: true,
  }
}

export function findStaffMemberByEmail(list: StaffMember[], email: string): StaffMember | undefined {
  const needle = email.trim().toLowerCase()
  if (!needle) return undefined
  return list.find((item) => item.email.trim().toLowerCase() === needle)
}

export function toCreateStaffBody(input: CreateStaffMemberInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: STAFF_ROLE_TO_CODE[input.role],
  }
}

export function toUpdateStaffBody(input: UpdateStaffMemberInput) {
  // NB: `isActive` n'est volontairement pas envoye ici. Le backend rejette ce
  // champ sur PATCH /staff/staff/:id ; l'activation/desactivation passe par les
  // routes dediees enable/disable (voir provider.setActive).
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.name = input.name.trim()
  if (input.role !== undefined) body.role = STAFF_ROLE_TO_CODE[input.role]
  return body
}
