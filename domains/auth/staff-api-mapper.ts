import type { LoginResponse, UserRole } from "@/types"

export type StaffApiProfile = {
  staffId?: string
  id?: string
  friendlyId?: string
  email?: string
  phone?: string
  name?: string
  fullName?: string
  role?: string | number
  requiresPasswordChange?: boolean
}

const STAFF_ROLE_CODES: Record<number, UserRole> = {
  1000: "admin",
  300: "accountant",
  400: "accountant",
  500: "accountant",
  600: "manager",
  200: "collaborateur",
}

export function mapStaffRoleFromApi(apiRole?: string | number): UserRole {
  if (typeof apiRole === "number") {
    const role = STAFF_ROLE_CODES[apiRole]
    if (!role) throw new Error("INVALID_CREDENTIALS")
    return role
  }

  const normalized = (apiRole ?? "").toLowerCase().trim()
  if (normalized === "admin" || normalized === "administrator") return "admin"
  if (normalized === "manager") return "manager"
  if (normalized === "accountant" || normalized === "comptable") return "accountant"
  if (normalized === "collaborateur" || normalized === "collaborator") return "collaborateur"
  if (!normalized && apiRole === undefined) throw new Error("INVALID_CREDENTIALS")
  throw new Error("INVALID_CREDENTIALS")
}

export function pickStaffProfile(data: unknown): StaffApiProfile {
  if (!data || typeof data !== "object") return {}
  const record = data as Record<string, unknown>
  if (record.staff && typeof record.staff === "object") {
    return record.staff as StaffApiProfile
  }
  if (record.user && typeof record.user === "object") {
    return record.user as StaffApiProfile
  }
  return record as StaffApiProfile
}

function extractToken(data: Record<string, unknown>): string | null {
  for (const key of ["token", "accessToken", "access_token", "jwt"]) {
    const value = data[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

export function parseStaffLoginPayload(data: unknown): {
  token: string
  staff: StaffApiProfile
  requiresPasswordChange: boolean
} {
  if (!data || typeof data !== "object") throw new Error("INVALID_CREDENTIALS")
  const record = data as Record<string, unknown>
  const token = extractToken(record)
  if (!token) throw new Error("INVALID_CREDENTIALS")

  const staff = pickStaffProfile(record)
  const requiresPasswordChange = Boolean(
    record.requiresPasswordChange ?? record.mustChangePassword ?? staff.requiresPasswordChange,
  )

  return { token, staff, requiresPasswordChange }
}

export function toStaffSession(
  token: string,
  staff: StaffApiProfile,
  requiresPasswordChange: boolean,
  fallbackEmail?: string,
): LoginResponse {
  const role = mapStaffRoleFromApi(staff.role)
  if (role === "student") throw new Error("INVALID_CREDENTIALS")

  return {
    token,
    role,
    mustChangePin: requiresPasswordChange,
    email: staff.email ?? fallbackEmail,
    phone: staff.phone,
    staffUserId: staff.staffId ?? staff.id ?? staff.friendlyId,
    fullName: staff.fullName ?? staff.name,
  }
}

export function staffProfileToSession(
  current: LoginResponse,
  staff: StaffApiProfile,
  requiresPasswordChange?: boolean,
): LoginResponse {
  let role = current.role
  if (staff.role !== undefined && staff.role !== null && staff.role !== "") {
    try {
      role = mapStaffRoleFromApi(staff.role)
    } catch {
      role = current.role
    }
  }
  return {
    ...current,
    role,
    mustChangePin: requiresPasswordChange ?? staff.requiresPasswordChange ?? current.mustChangePin,
    email: staff.email ?? current.email,
    phone: staff.phone ?? current.phone,
    staffUserId: staff.staffId ?? staff.id ?? staff.friendlyId ?? current.staffUserId,
    fullName: staff.fullName ?? staff.name ?? current.fullName,
  }
}
