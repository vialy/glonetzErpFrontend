import type { StaffClass } from "@/domains/classes/types"

export type LearnerBalanceInput = {
  classId: string
  due: number
  paid: number
}

export function resolveLearnerDue(
  learner: LearnerBalanceInput,
  classes: Pick<StaffClass, "id" | "tuitionAmount">[],
): number {
  if (learner.due > 0) return learner.due
  const cls = classes.find((item) => item.id === learner.classId)
  return cls?.tuitionAmount ?? 0
}

export function resolveLearnerRemaining(
  learner: LearnerBalanceInput,
  classes: Pick<StaffClass, "id" | "tuitionAmount">[],
): number {
  const due = resolveLearnerDue(learner, classes)
  return Math.max(0, due - learner.paid)
}

export function isLearnerFullyPaid(
  learner: LearnerBalanceInput,
  classes: Pick<StaffClass, "id" | "tuitionAmount">[],
): boolean {
  return resolveLearnerRemaining(learner, classes) <= 0.01
}
