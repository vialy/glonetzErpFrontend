import type { Certificate } from "@/domains/certificates/types"
import type { UserRole } from "@/types"
import { SchoolCertificateTemplateService } from "@/services/school-certificate-template.service"

export type SchoolCertDownloadActor = UserRole | "learner" | null

export interface SchoolCertDownloadContext {
  tuitionFullyPaid: boolean
}

export interface SchoolCertDownloadDecision {
  allowed: boolean
  reason?: string
}

function isSchoolCertificate(cert: Certificate): boolean {
  return cert.certificateKind === "scolarite"
}

/**
 * Règles de téléchargement du certificat de scolarité :
 * - Apprenant : pension soldée + cachet et signature approuvés sur le modèle global.
 * - Admin : peut télécharger même si pension non soldée ; aperçu possible sans validation cachet/sig.
 * - Manager : pension soldée requise (pas de dérogation) ; cachet/sig requis comme pour l'apprenant.
 */
export function canDownloadSchoolCertificate(
  actor: SchoolCertDownloadActor,
  certificate: Certificate,
  ctx: SchoolCertDownloadContext,
  options?: { preview?: boolean },
): SchoolCertDownloadDecision {
  if (!isSchoolCertificate(certificate)) {
    return { allowed: false, reason: "Document non reconnu comme certificat de scolarité." }
  }

  const templateReady = SchoolCertificateTemplateService.isReadyForLearnerDownload()
  const preview = options?.preview === true

  if (actor === "admin") {
    if (preview) return { allowed: true }
    if (!templateReady) {
      return {
        allowed: true,
        reason: "Cachet ou signature non validés sur le modèle — document informatif.",
      }
    }
    return { allowed: true }
  }

  if (!templateReady) {
    return {
      allowed: false,
      reason: "Le certificat n'est pas encore disponible : validez le cachet et la signature sur le modèle.",
    }
  }

  if (actor === "manager" && !ctx.tuitionFullyPaid) {
    return {
      allowed: false,
      reason: "Pension non soldée — téléchargement réservé à l'administrateur.",
    }
  }

  if (actor === "learner" && !ctx.tuitionFullyPaid) {
    return {
      allowed: false,
      reason: "Votre pension doit être entièrement réglée pour télécharger le certificat.",
    }
  }

  return { allowed: true }
}

export function schoolCertificatePaymentLabel(fullyPaid: boolean): string {
  return fullyPaid ? "Soldée" : "En cours"
}
