import type { StaffClass } from "@/domains/classes/types"

export function countLearnersByClassId(learners: { classId: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const learner of learners) {
    const classId = learner.classId?.trim()
    if (!classId) continue
    counts.set(classId, (counts.get(classId) ?? 0) + 1)
  }
  return counts
}

export function enrichClassWithLearnerStats(cls: StaffClass, attachedCount: number): StaffClass {
  const learnersCount = cls.learnersCount > 0 ? cls.learnersCount : attachedCount
  const totalDue =
    cls.totalDue > 0
      ? cls.totalDue
      : learnersCount > 0 && cls.tuitionAmount > 0
        ? cls.tuitionAmount * learnersCount
        : 0

  return {
    ...cls,
    learnersCount,
    totalDue,
  }
}

export function enrichClassesWithLearnerStats(
  classes: StaffClass[],
  learners: { classId: string }[],
): StaffClass[] {
  const counts = countLearnersByClassId(learners)
  return classes.map((cls) => enrichClassWithLearnerStats(cls, counts.get(cls.id) ?? 0))
}
