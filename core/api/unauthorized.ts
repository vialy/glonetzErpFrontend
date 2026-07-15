import { clearAuthBrowserState } from "@/services/auth.service"
import { ERROR_CODES } from "@/core/api/error-codes"

export const STAFF_SESSION_EXPIRED_EVENT = "glonetz-staff-session-expired"

const PUBLIC_API_SUFFIXES = [
  "/staff/auth/login",
  "/staff/auth/request-password-reset",
  "/staff/auth/reset-password",
]

const PASSWORD_CHANGE_ERROR_KEYS = [
  "wrong_password",
  "invalid_current_password",
  "password_same",
  "password_too_weak",
  "weak_password",
  "generic_error",
]

const SESSION_INVALID_ERROR_CODES: number[] = [
  ERROR_CODES.UNAUTHORIZED,
  ERROR_CODES.FORBIDDEN,
  ERROR_CODES.INVALID_TOKEN,
  ERROR_CODES.EXPIRED_TOKEN,
  ERROR_CODES.ACCOUNT_DISABLED,
]

const SESSION_INVALID_MESSAGES = [
  "unauthorized",
  "unauthenticated",
  "invalid_token",
  "expired_token",
  "missing_token",
  "account_disabled",
]

let handlingUnauthorized = false

function normalizeApiPath(path: string) {
  const withSlash = path.startsWith("/") ? path : `/${path}`
  return withSlash.startsWith("/api/") ? withSlash : `/api${withSlash}`
}

export function isPublicStaffAuthApiPath(path: string): boolean {
  const normalized = normalizeApiPath(path)
  return PUBLIC_API_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

export function isSessionUnauthorizedError(
  path: string,
  options: { status: number; errorCode?: number; message?: string; hadToken: boolean },
): boolean {
  if (!options.hadToken) return false
  if (isPublicStaffAuthApiPath(path)) return false

  const normalizedPath = normalizeApiPath(path)
  const message = (options.message ?? "").trim().toLowerCase()

  if (normalizedPath.includes("/staff/auth/change-password")) {
    if (PASSWORD_CHANGE_ERROR_KEYS.some((key) => message === key || message.includes(key))) {
      return false
    }
  }

  if (options.errorCode === ERROR_CODES.PASSWORD_CHANGE_REQUIRED) return false

  if (options.status === 401 || options.status === 403) return true
  if (options.errorCode !== undefined && SESSION_INVALID_ERROR_CODES.includes(options.errorCode)) {
    return true
  }
  if (SESSION_INVALID_MESSAGES.some((key) => message === key || message.includes(key))) return true

  return false
}

export function handleSessionUnauthorized(): void {
  if (typeof window === "undefined" || handlingUnauthorized) return
  handlingUnauthorized = true

  clearAuthBrowserState({ clearMockPinOverrides: false })
  window.dispatchEvent(new CustomEvent(STAFF_SESSION_EXPIRED_EVENT))
  window.location.replace("/login?sessionExpired=1")
}
