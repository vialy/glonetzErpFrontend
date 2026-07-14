import type { Certificate } from "@/domains/certificates"

/** Normalise un nom pour comparaison insensible à la casse / aux espaces. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

interface LearnerLike {
  id: string
  fullName: string
  dateOfBirth?: string
  classId?: string
}

export function isFormationCertificate(cert: Certificate): boolean {
  return (cert.certificateKind ?? "formation") === "formation"
}

/**
 * Vérifie si un apprenant a déjà une attestation de formation pour une classe donnée.
 * Un apprenant promu (A1 → A2) peut donc recevoir une nouvelle attestation par classe/niveau.
 */
export function learnerHasFormationCertificateForClass(
  certificates: Certificate[],
  learner: LearnerLike,
  classId: string,
): boolean {
  if (!classId) return false
  const formationCerts = certificates.filter(
    (c) => isFormationCertificate(c) && c.classId === classId,
  )

  if (learner.id && formationCerts.some((c) => c.learnerId === learner.id)) return true

  const dob = (learner.dateOfBirth ?? "").slice(0, 10)
  if (!learner.fullName || !dob) return false
  const key = `${normalizeName(learner.fullName)}|${dob}`
  return formationCerts.some(
    (c) => c.fullName && c.dateOfBirth && `${normalizeName(c.fullName)}|${c.dateOfBirth.slice(0, 10)}` === key,
  )
}

/**
 * Construit un prédicat « cet apprenant a-t-il déjà une attestation pour cette classe ? ».
 * Si `classId` est omis, on utilise `learner.classId` (classe actuelle).
 */
export function buildCertifiedLearnerMatcher(
  certificates: Certificate[],
  options?: { classId?: string },
): (learner: LearnerLike) => boolean {
  return (learner: LearnerLike): boolean => {
    const classId = options?.classId ?? learner.classId
    if (!classId) return false
    return learnerHasFormationCertificateForClass(certificates, learner, classId)
  }
}
