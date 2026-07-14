import type { Certificate, CertificateLevel } from "@/domains/certificates/types"
import type { StaffClass } from "@/domains/classes/types"
import type { StaffLearner } from "@/domains/learners/types"
import { inferClassLevelFromName, isClassLevel, normalizeStoredClassTimeSlot } from "@/lib/class-metadata"
import { CertificatesService } from "@/services/certificates.service"

function resolveLevel(learner: StaffLearner, klass?: StaffClass | null): CertificateLevel {
  if (klass?.level && isClassLevel(klass.level)) return klass.level
  const fromName = inferClassLevelFromName(klass?.name ?? learner.className ?? "")
  if (fromName) return fromName
  return "A1"
}

/**
 * Crée ou met à jour le certificat de scolarité d'un apprenant pour sa classe actuelle.
 * Un seul certificat scolarité par apprenant ; remplacé à chaque changement de classe.
 */
export function provisionSchoolCertificateForLearner(
  learner: StaffLearner,
  klass?: StaffClass | null,
): Certificate {
  const level = resolveLevel(learner, klass)
  const periodStart = klass?.periodStart ?? new Date().toISOString().slice(0, 10)
  const periodEnd = klass?.periodEnd ?? periodStart
  const timeSlot = normalizeStoredClassTimeSlot(klass?.timeSlot)

  return CertificatesService.syncSchoolCertificate({
    learnerId: learner.id,
    fullName: learner.fullName,
    dateOfBirth: learner.dateOfBirth || "2000-01-01",
    placeOfBirth: learner.placeOfBirth || "—",
    referenceLevel: level,
    courseStartDate: periodStart,
    courseEndDate: periodEnd,
    classId: learner.classId,
    className: klass?.name ?? learner.className,
    timeSlot,
  })
}

/** Assure un certificat de scolarité pour chaque apprenant de la liste. */
export function syncSchoolCertificatesForLearners(
  learners: StaffLearner[],
  classesById: Record<string, StaffClass | undefined>,
): Certificate[] {
  return learners.map((learner) =>
    provisionSchoolCertificateForLearner(learner, classesById[learner.classId]),
  )
}
