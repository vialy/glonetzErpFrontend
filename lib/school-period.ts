import type { StaffClass } from "@/domains/classes/types"
import { isPeriodEnded } from "@/lib/certificate-permissions"

/** Scolarité terminée : classe archivée/terminée ou date de fin atteinte. */
export function isSchoolPeriodFinished(
  cls: Pick<StaffClass, "status" | "periodEnd"> | null | undefined,
): boolean {
  if (!cls) return true
  if (cls.status === "finished" || cls.status === "archived") return true
  return isPeriodEnded(cls.periodEnd)
}
