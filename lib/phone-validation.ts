/** Cameroon mobile: +237 followed by 9 digits starting with 6 (e.g. +2376XXXXXXXX).
 *  SMS credentials only reach mobiles, so non-mobile numbers are rejected. */
const CM_NATIONAL = /^\+2376\d{8}$/

/** Generic E.164 (8–15 digits after country code) */
const E164 = /^\+[1-9]\d{7,14}$/

/** Longueur max du numero national (sans indicatif) par indicatif pays. */
const NATIONAL_DIGIT_LIMITS: Record<string, number> = {
  "237": 9,
  "225": 10,
  "221": 9,
  "226": 8,
  "228": 8,
  "229": 8,
  "234": 10,
  "33": 9,
}

export function getMaxNationalDigits(dialCode: string): number {
  return NATIONAL_DIGIT_LIMITS[dialCode] ?? 15
}

/** Tronque un numero E.164 si le segment national depasse la limite du pays. */
export function clampPhoneNationalDigits(phone: string, dialCode: string): string {
  const max = getMaxNationalDigits(dialCode)
  const normalized = formatPhoneE164(phone)
  const prefix = `+${dialCode}`
  if (!normalized.startsWith(prefix)) return normalized

  const national = normalized.slice(prefix.length).replace(/\D/g, "")
  if (national.length <= max) return normalized
  return `${prefix}${national.slice(0, max)}`
}

export function validatePhoneE164(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "")
  if (!normalized.startsWith("+")) return false

  if (normalized.startsWith("+237")) {
    return CM_NATIONAL.test(normalized)
  }

  return E164.test(normalized)
}

export function formatPhoneE164(phone: string): string {
  return phone.replace(/[\s-]/g, "")
}
