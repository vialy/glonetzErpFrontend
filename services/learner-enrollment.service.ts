"use client"

import { apiRequest } from "@/core/api/client"
import { isApiDataProvider } from "@/lib/data-provider"
import { parseClassEnrollmentList } from "@/lib/learner-enrollment-api-mapper"

export interface LearnerClassEnrollment {
  id: string
  learnerId: string
  classId: string
  className: string
  periodStart?: string
  periodEnd?: string
  tuitionDue: number
  enrolledAt: string
  leftAt?: string
  isActive?: boolean
  source: "initial" | "promotion" | "manual"
}

const ENROLLMENT_PAGE_SIZE = 100

const STORAGE_KEY = "glonetz_learner_enrollments_v1"
const CLASSES_KEY = "glonetz_admin_classes_v1"
const LEARNERS_KEY = "glonetz_admin_learners_v1"

export const ENROLLMENTS_UPDATED_EVENT = "learner-enrollments-updated"

interface StoredClass {
  id: string
  name: string
  periodStart?: string
  periodEnd?: string
  tuitionAmount?: number
}

interface StoredLearner {
  id: string
  classId: string
  createdAt?: string
}

const DEFAULT_CLASSES: StoredClass[] = [
  { id: "a1-jan-2025", name: "A1 - Jan 2025", periodStart: "2025-01-01", periodEnd: "2025-06-30", tuitionAmount: 162_000 },
  { id: "a2-apr-2025", name: "A2 - Apr 2025", periodStart: "2025-04-01", periodEnd: "2025-09-30", tuitionAmount: 170_000 },
  { id: "b1-sep-2024", name: "B1 - Sep 2024", periodStart: "2024-09-01", periodEnd: "2025-03-31", tuitionAmount: 180_000 },
]

const DEFAULT_LEARNERS: StoredLearner[] = [
  { id: "l1", classId: "a1-jan-2025", createdAt: "2025-01-10" },
  { id: "l2", classId: "a1-jan-2025", createdAt: "2025-01-11" },
  { id: "l3", classId: "a1-jan-2025", createdAt: "2025-01-12" },
  { id: "l4", classId: "a2-apr-2025", createdAt: "2025-04-05" },
  { id: "l5", classId: "a2-apr-2025", createdAt: "2025-04-06" },
  { id: "l6", classId: "b1-sep-2024", createdAt: "2025-12-15" },
]

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readJson<T>(key: string): T[] | null {
  if (!canUseStorage()) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readClasses(): StoredClass[] {
  return readJson<StoredClass>(CLASSES_KEY) ?? DEFAULT_CLASSES
}

function readLearners(): StoredLearner[] {
  return readJson<StoredLearner>(LEARNERS_KEY) ?? DEFAULT_LEARNERS
}

function readAll(): LearnerClassEnrollment[] {
  if (!canUseStorage()) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows: LearnerClassEnrollment[]) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new Event(ENROLLMENTS_UPDATED_EVENT))
}

function classMeta(classId: string): Pick<LearnerClassEnrollment, "className" | "periodStart" | "periodEnd" | "tuitionDue"> {
  const cls = readClasses().find((c) => c.id === classId)
  return {
    className: cls?.name ?? classId,
    periodStart: cls?.periodStart,
    periodEnd: cls?.periodEnd,
    tuitionDue: cls?.tuitionAmount ?? 0,
  }
}

function seedIfEmpty() {
  if (readAll().length > 0) return

  const rows: LearnerClassEnrollment[] = []
  const learners = readLearners()

  for (const learner of learners) {
    rows.push({
      id: `ENR-${learner.id}-current`,
      learnerId: learner.id,
      classId: learner.classId,
      ...classMeta(learner.classId),
      enrolledAt: learner.createdAt || new Date().toISOString(),
      source: "initial",
    })
  }

  for (const learnerId of ["l4", "l5"]) {
    const learner = learners.find((l) => l.id === learnerId)
    if (!learner) continue

    const promotedAt = "2026-03-10T09:20:00.000Z"
    const without = rows.filter((r) => r.learnerId !== learnerId)

    rows.length = 0
    rows.push(...without)
    rows.push({
      id: `ENR-${learnerId}-a1`,
      learnerId,
      classId: "a1-jan-2025",
      ...classMeta("a1-jan-2025"),
      enrolledAt: learner.createdAt || "2025-01-10",
      leftAt: promotedAt,
      source: "initial",
    })
    rows.push({
      id: `ENR-${learnerId}-a2`,
      learnerId,
      classId: learner.classId,
      ...classMeta(learner.classId),
      enrolledAt: promotedAt,
      source: "promotion",
    })
  }

  writeAll(rows)
}

async function fetchStaffEnrollments(learnerId: string): Promise<LearnerClassEnrollment[]> {
  const data = await apiRequest<unknown>(`/staff/users/${encodeURIComponent(learnerId)}/classes`, {
    method: "GET",
    query: { pageNum: 1, pageSize: ENROLLMENT_PAGE_SIZE },
  })
  return parseClassEnrollmentList(data, learnerId)
}

export const LearnerEnrollmentService = {
  getForLearner(learnerId: string): LearnerClassEnrollment[] {
    if (isApiDataProvider()) return []
    seedIfEmpty()
    return readAll()
      .filter((r) => r.learnerId === learnerId)
      .sort((a, b) => new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime())
  },

  async fetchForLearner(learnerId: string): Promise<LearnerClassEnrollment[]> {
    if (isApiDataProvider()) {
      return fetchStaffEnrollments(learnerId)
    }
    return this.getForLearner(learnerId)
  },

  recordInitial(learnerId: string, classId: string, enrolledAt?: string) {
    seedIfEmpty()
    const row: LearnerClassEnrollment = {
      id: `ENR-${learnerId}-${Date.now()}`,
      learnerId,
      classId,
      ...classMeta(classId),
      enrolledAt: enrolledAt ?? new Date().toISOString(),
      source: "initial",
    }
    writeAll([row, ...readAll()])
  },

  recordPromotion(learnerId: string, fromClassId: string, toClassId: string) {
    if (fromClassId === toClassId) return
    seedIfEmpty()
    const now = new Date().toISOString()
    const all = readAll()
    const next = all.map((r) =>
      r.learnerId === learnerId && r.classId === fromClassId && !r.leftAt ? { ...r, leftAt: now } : r,
    )
    next.push({
      id: `ENR-${learnerId}-${Date.now()}`,
      learnerId,
      classId: toClassId,
      ...classMeta(toClassId),
      enrolledAt: now,
      source: "promotion",
    })
    writeAll(next)
  },

  /** Profile correction — update current class without adding history. */
  recordManualClassChange(learnerId: string, _fromClassId: string, toClassId: string) {
    seedIfEmpty()
    const all = readAll()
    const idx = all.findIndex((r) => r.learnerId === learnerId && !r.leftAt)
    if (idx === -1) return
    const row = all[idx]
    if (row.classId === toClassId) return
    const updated = [...all]
    updated[idx] = {
      ...row,
      classId: toClassId,
      ...classMeta(toClassId),
    }
    writeAll(updated)
  },

  removeForLearner(learnerId: string) {
    seedIfEmpty()
    writeAll(readAll().filter((r) => r.learnerId !== learnerId))
  },
}
