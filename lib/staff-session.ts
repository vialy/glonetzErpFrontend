import type { LoginResponse, UserRole } from "@/types"

export const STAFF_SESSION_COOKIE = "glonetz_staff_session"

export function parseStaffSessionCookie(value: string | undefined | null): LoginResponse | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as LoginResponse
    if (!parsed?.token || typeof parsed.token !== "string") return null
    if (parsed.role === "student") return null
    return parsed
  } catch {
    return null
  }
}

export function isStaffDashboardRole(role: unknown): role is Exclude<UserRole, "student"> {
  return role === "admin" || role === "manager" || role === "accountant"
}
