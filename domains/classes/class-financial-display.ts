import type { StaffClass, StaffClassStats } from "@/domains/classes/types"

export interface ClassFinancialView {
  learnersCurrent: number
  sessionEnrolled: number
  sessionPromoted: number
  tuitionAmount: number
  catalogExpected: number
  netExpected: number
  totalScholarship: number
  scholarshipCount: number
  /** En cours × pension actuelle (catalogue). */
  totalDueCurrent: number
  /** Inscrits × pension actuelle (catalogue). */
  totalDueExpected: number
  totalPaidClass: number
  /** Net attendu − encaissé. */
  remaining: number
}

function dueFromHeadcount(headcount: number, tuitionAmount: number) {
  if (headcount <= 0 || tuitionAmount <= 0) return 0
  return Math.round(headcount * tuitionAmount)
}

/**
 * Règles d'affichage fiche classe :
 *   - scolarité actuelle = en cours × pension
 *   - scolarité attendue = inscrits × pension
 *   - reste = scolarité attendue (inscrits) − encaissé classe
 */
export function classFinancialFromStats(
  stats: StaffClassStats | null | undefined,
  fallback: {
    learnersCount: number
    totalDue: number
    totalPaid: number
    tuitionAmount: number
  },
): ClassFinancialView {
  const current = stats?.current
  const session = stats?.session
  const tuitionAmount = fallback.tuitionAmount

  const learnersCurrent =
    current?.studentCount ?? stats?.studentCount ?? fallback.learnersCount
  const sessionEnrolled = session?.studentCount ?? learnersCurrent
  const sessionPromoted = session?.leftCount ?? 0
  const totalPaidClass =
    session?.totalPaid ?? stats?.totalPaid ?? fallback.totalPaid

  const totalDueCurrent =
    current?.catalogExpected != null && current.catalogExpected > 0
      ? current.catalogExpected
      : tuitionAmount > 0
        ? dueFromHeadcount(learnersCurrent, tuitionAmount)
        : (current?.totalExpected ?? fallback.totalDue)
  const totalDueExpected =
    current?.catalogExpected != null && current.catalogExpected > 0
      ? current.catalogExpected
      : tuitionAmount > 0
        ? dueFromHeadcount(sessionEnrolled, tuitionAmount)
        : totalDueCurrent

  const netExpected =
    current?.netExpected != null && current.netExpected >= 0
      ? current.netExpected
      : totalDueCurrent
  const totalScholarship = current?.totalScholarship ?? 0
  const scholarshipCount = current?.scholarshipCount ?? 0

  return {
    learnersCurrent,
    sessionEnrolled,
    sessionPromoted,
    tuitionAmount,
    catalogExpected: totalDueCurrent,
    netExpected,
    totalScholarship,
    scholarshipCount,
    totalDueCurrent,
    totalDueExpected,
    totalPaidClass,
    remaining:
      current?.totalRemaining != null
        ? Math.max(0, current.totalRemaining)
        : Math.max(0, netExpected - totalPaidClass),
  }
}

export function applyClassStatsToRow(
  cls: StaffClass,
  stats: StaffClassStats | null | undefined,
  fallbackPaid: number,
): StaffClass {
  const fin = classFinancialFromStats(stats, {
    learnersCount: cls.learnersCount,
    totalDue: cls.totalDue,
    totalPaid: fallbackPaid,
    tuitionAmount: cls.tuitionAmount,
  })
  return {
    ...cls,
    learnersCount: fin.learnersCurrent,
    totalDue: fin.totalDueCurrent,
    totalPaid: fin.totalPaidClass,
    totalDueExpected: fin.totalDueExpected,
    totalRemaining: fin.remaining,
    sessionEnrolledCount: fin.sessionEnrolled,
    sessionPromotedCount: fin.sessionPromoted,
  }
}
