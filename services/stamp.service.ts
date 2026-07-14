"use client"

/**
 * Stockage du cachet de l'entreprise (image PNG transparente).
 * Même approche que SignatureService — localStorage pour l'instant.
 */

const STORAGE_KEY = "glonetz_company_stamp_v1"
export const STAMP_UPDATED_EVENT = "company-stamp-updated"

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export const StampService = {
  get(): string | null {
    if (!canUseStorage()) return null
    const value = localStorage.getItem(STORAGE_KEY)
    return value && value.startsWith("data:image") ? value : null
  },

  set(dataUrl: string): void {
    if (!canUseStorage()) return
    localStorage.setItem(STORAGE_KEY, dataUrl)
    window.dispatchEvent(new Event(STAMP_UPDATED_EVENT))
  },

  remove(): void {
    if (!canUseStorage()) return
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(STAMP_UPDATED_EVENT))
  },
}
