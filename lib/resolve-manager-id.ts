import { getAdminUsers } from "@/services/admin-mock.service"

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("237") && digits.length >= 12) return digits.slice(3)
  return digits.slice(-9)
}

/** Résout l'id admin (u2, …) à partir du téléphone de session manager. */
export function resolveManagerIdByPhone(phone: string | null | undefined): string {
  if (!phone) return "u2"
  const target = normalizePhoneDigits(phone)

  const mockAliases: Record<string, string> = {
    "600000002": "u2",
    "677200002": "u2",
  }
  if (mockAliases[target]) return mockAliases[target]

  const manager = getAdminUsers().find(
    (u) => u.role === "manager" && u.status === "active" && normalizePhoneDigits(u.phone) === target,
  )
  return manager?.id ?? "u2"
}
