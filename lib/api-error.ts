import { ApiClientError } from "@/core/api/client"

const API_ERROR_HINTS: Record<string, string> = {
  generic_error:
    "Verifiez le mot de passe actuel et que le nouveau respecte les regles : 8 caracteres minimum, une majuscule, une minuscule, un chiffre et un symbole (ex. NewPassw0rd!).",
  wrong_password: "Mot de passe actuel incorrect.",
  invalid_current_password: "Mot de passe actuel incorrect.",
  password_same: "Le nouveau mot de passe doit etre different de l'ancien.",
  password_too_weak: "Mot de passe trop faible : 8 caracteres, majuscule, minuscule, chiffre et symbole requis.",
  weak_password: "Mot de passe trop faible : 8 caracteres, majuscule, minuscule, chiffre et symbole requis.",
  unauthorized: "Session expiree. Reconnectez-vous.",
  unauthenticated: "Session expiree. Reconnectez-vous.",
}

export function humanizeApiErrorMessage(raw: string, errorCode?: number): string {
  const key = raw.trim().toLowerCase()
  if (API_ERROR_HINTS[key]) return API_ERROR_HINTS[key]
  if (key.includes("current") && key.includes("password")) return API_ERROR_HINTS.invalid_current_password
  if (key.includes("weak") || key.includes("strength")) return API_ERROR_HINTS.password_too_weak
  if (errorCode === 401 || errorCode === 403 || errorCode === 1002) return API_ERROR_HINTS.unauthorized
  if (raw && raw !== "API request failed") return raw
  if (key.includes("status") && key.includes("not allowed")) {
    return "Le statut de la classe ne peut pas etre modifie via l'API pour le moment."
  }
  return API_ERROR_HINTS.generic_error
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return humanizeApiErrorMessage(error.message, error.errorCode)
  }
  if (error instanceof Error && error.message) {
    return humanizeApiErrorMessage(error.message)
  }
  return fallback
}

/** Regles alignees sur les exemples Hoppscotch / backend (ex. NewPassw0rd!). */
export function isStaffPasswordStrong(password: string): boolean {
  if (password.length < 8) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}
