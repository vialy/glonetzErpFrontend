import { formatPhoneE164, validatePhoneE164 } from "@/lib/phone-validation"

export type AdminUserPhoneError = "empty" | "invalid_format"

/** Parse et valide un numero admin (E.164, Cameroun +237 par defaut). */
export function parseAdminUserPhone(
  raw: string,
): { ok: true; e164: string } | { ok: false; error: AdminUserPhoneError } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: "empty" }

  let candidate = formatPhoneE164(trimmed)

  if (!candidate.startsWith("+")) {
    const digits = candidate.replace(/\D/g, "")
    if (digits.length === 0) return { ok: false, error: "invalid_format" }
    if (digits.length === 9) candidate = `+237${digits}`
    else if (digits.startsWith("237") && digits.length === 12) candidate = `+${digits}`
    else if (digits.length >= 8 && digits.length <= 15) candidate = `+${digits}`
    else return { ok: false, error: "invalid_format" }
  }

  if (!validatePhoneE164(candidate)) return { ok: false, error: "invalid_format" }
  return { ok: true, e164: candidate }
}

/** Cle canonique pour comparer les doublons (y compris anciennes donnees sans +). */
export function canonicalAdminUserPhone(phone: string): string {
  const parsed = parseAdminUserPhone(phone)
  if (parsed.ok) return parsed.e164
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 9) return `+237${digits}`
  if (digits.startsWith("237") && digits.length === 12) return `+${digits}`
  return formatPhoneE164(phone)
}

export function isAdminUserPhoneValid(raw: string): boolean {
  return parseAdminUserPhone(raw).ok
}

export function getAdminUserPhoneFieldError(
  phone: string,
  touched: boolean,
  messages: { empty: string; invalid: string; duplicate: string },
  isDuplicate: boolean,
): string | null {
  if (!touched) return null
  if (!phone.trim()) return messages.empty
  if (!isAdminUserPhoneValid(phone)) return messages.invalid
  if (isDuplicate) return messages.duplicate
  return null
}

/** Valeur affichee dans PhoneInputField (convertit un stockage legacy). */
export function adminUserPhoneToInputValue(stored: string): string {
  const parsed = parseAdminUserPhone(stored)
  if (parsed.ok) return parsed.e164
  const digits = stored.replace(/\D/g, "")
  if (digits.length === 9) return `+237${digits}`
  if (digits.startsWith("237") && digits.length === 12) return `+${digits}`
  return stored.trim().startsWith("+") ? formatPhoneE164(stored) : stored
}
