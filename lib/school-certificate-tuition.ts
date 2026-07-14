import type { StaffClass } from "@/domains/classes/types"
import { isLearnerFullyPaid } from "@/domains/learners/learner-balance"
import type { StaffLearner } from "@/domains/learners/types"
import type { SchoolCertificate } from "@/domains/school-certificates"

/**
 * Pension soldée pour un certificat de scolarité.
 * En mode API, privilégie `tuitionFullyPaid` calculé par Payment.classSummary côté back-end.
 */
export function resolveSchoolCertificateTuitionFullyPaid(
  certificate: SchoolCertificate,
  learner: StaffLearner | undefined,
  classes: Pick<StaffClass, "id" | "tuitionAmount">[],
): boolean {
  if (typeof certificate.tuitionFullyPaid === "boolean") {
    return certificate.tuitionFullyPaid
  }
  if (!learner) return false
  return isLearnerFullyPaid(learner, classes)
}
