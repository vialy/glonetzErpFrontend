"use client"

import { apiRequest } from "@/core/api/client"
import { isApiDataProvider } from "@/lib/data-provider"

/**
 * Signature du directeur pour les attestations de formation.
 * En mode API : persistée via /staff/certificates/signature.
 */

const STORAGE_KEY = "glonetz_certificate_signature_v1"
export const SIGNATURE_UPDATED_EVENT = "certificate-signature-updated"

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function parseSignaturePayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const template = (data as { template?: { signatureImageUrl?: string } }).template
  const url = template?.signatureImageUrl
  return url && url.startsWith("data:image") ? url : null
}

export const SignatureService = {
  get(): string | null {
    if (!canUseStorage()) return null
    const value = localStorage.getItem(STORAGE_KEY)
    return value && value.startsWith("data:image") ? value : null
  },

  set(dataUrl: string): void {
    if (!canUseStorage()) return
    localStorage.setItem(STORAGE_KEY, dataUrl)
    window.dispatchEvent(new Event(SIGNATURE_UPDATED_EVENT))
  },

  remove(): void {
    if (!canUseStorage()) return
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(SIGNATURE_UPDATED_EVENT))
  },

  async fetch(): Promise<string | null> {
    if (!isApiDataProvider()) return this.get()
    try {
      const data = await apiRequest<unknown>("/staff/certificates/signature", { method: "GET" })
      const url = parseSignaturePayload(data)
      if (url && canUseStorage()) localStorage.setItem(STORAGE_KEY, url)
      return url ?? this.get()
    } catch {
      return this.get()
    }
  },

  async saveRemote(dataUrl: string | null): Promise<void> {
    if (isApiDataProvider()) {
      await apiRequest<unknown>("/staff/certificates/signature", {
        method: "PUT",
        body: { signatureImageUrl: dataUrl },
      })
    }
    if (dataUrl) this.set(dataUrl)
    else this.remove()
  },

  /** Nombre d'attestations de formation déjà générées (disponibles). */
  async countGeneratedFormations(): Promise<number> {
    if (!isApiDataProvider()) {
      const { CertificatesService } = await import("@/services/certificates.service")
      return CertificatesService.countGeneratedFormations()
    }
    try {
      const data = await apiRequest<{ count?: number }>("/staff/certificates/signature/generated-count", {
        method: "GET",
      })
      return typeof data?.count === "number" ? data.count : 0
    } catch {
      return 0
    }
  },

  /**
   * Recopie la signature globale sur les attestations de formation déjà générées.
   * @returns nombre d'attestations mises à jour
   */
  async syncFormationSnapshots(): Promise<number> {
    if (!isApiDataProvider()) {
      const { CertificatesService } = await import("@/services/certificates.service")
      return CertificatesService.syncFormationSignatureSnapshots()
    }
    const data = await apiRequest<{ updatedCount?: number }>(
      "/staff/certificates/signature/sync-snapshots",
      { method: "POST" },
    )
    return typeof data?.updatedCount === "number" ? data.updatedCount : 0
  },
}
