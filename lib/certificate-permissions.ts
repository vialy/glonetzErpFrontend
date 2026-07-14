import type { Certificate } from "@/domains/certificates/types"
import type { StaffClass, StaffClassStatus } from "@/domains/classes/types"
import type { UserRole } from "@/types"

export function canDownloadCertificate(certificate: Certificate): boolean {
  return certificate.status === "disponible"
}

export function canPreviewCertificate(role: UserRole | null, certificate: Certificate): boolean {
  return role === "admin" && certificate.status !== "disponible"
}

export function canEditCertificate(role: UserRole | null, certificate: Certificate): boolean {
  if (certificate.status === "disponible") return false
  if (role === "admin") return true
  if (role === "manager") return certificate.createdByRole === "manager"
  return false
}

export function canDeleteCertificate(role: UserRole | null, certificate: Certificate): boolean {
  if (certificate.status === "disponible") return role === "admin"
  return canEditCertificate(role, certificate)
}

export function canApproveCertificate(role: UserRole | null): boolean {
  return role === "admin"
}

export function statusLabel(status: Certificate["status"]): string {
  switch (status) {
    case "disponible":
      return "Disponible"
    case "en_attente":
      return "En attente"
    default:
      return "Brouillon"
  }
}

/** True si la date ISO (yyyy-mm-dd ou datetime) est aujourd'hui ou dans le passé. */
export function isPeriodEnded(isoDate: string | undefined): boolean {
  if (!isoDate?.trim()) return false
  const normalized = isoDate.length <= 10 ? `${isoDate}T23:59:59` : isoDate
  const end = new Date(normalized)
  if (Number.isNaN(end.getTime())) return false
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  return end.getTime() <= todayEnd.getTime()
}

type ClassRef = Pick<StaffClass, "status" | "periodEnd" | "name">

/**
 * Une formation est considérée terminée pour l'approbation si :
 * - la classe liée a le statut `finished` ou `archived`, OU sa date de fin (`periodEnd`) est passée ;
 * - sinon (certificat sans classe), si la date de fin du certificat (`courseEndDate`) est passée.
 */
export function isTrainingFinishedForApproval(
  certificate: Certificate,
  classesById: Record<string, ClassRef | undefined>,
): boolean {
  if (certificate.classId) {
    const cls = classesById[certificate.classId]
    if (cls) {
      if (cls.status === "finished" || cls.status === "archived") return true
      if (isPeriodEnded(cls.periodEnd)) return true
    }
  }
  return isPeriodEnded(certificate.courseEndDate)
}

export function approvalBlockedReason(
  certificate: Certificate,
  classesById: Record<string, ClassRef | undefined>,
): string {
  if (isTrainingFinishedForApproval(certificate, classesById)) {
    return "Approuver (rendre téléchargeable)"
  }
  if (certificate.classId) {
    const cls = classesById[certificate.classId]
    if (cls) {
      const endLabel = new Date(cls.periodEnd).toLocaleDateString("fr-FR")
      return `Formation non terminée — classe active jusqu'au ${endLabel}, ou renseignez une date de fin passée sur le certificat.`
    }
  }
  const endLabel = certificate.courseEndDate
    ? new Date(certificate.courseEndDate).toLocaleDateString("fr-FR")
    : "—"
  return `Date de fin de formation non atteinte (${endLabel}).`
}

export function classStatusAllowsCertificates(status: StaffClassStatus): boolean {
  return status === "finished" || status === "archived"
}
