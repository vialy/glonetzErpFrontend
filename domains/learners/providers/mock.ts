"use client"

import {
  addAdminLearner,
  getAdminLearners,
  getLearnerById,
  setLearnerStatus,
  updateLearner,
} from "@/services/admin-mock.service"
import { LearnerEnrollmentService } from "@/services/learner-enrollment.service"
import type {
  BatchAssignClassInput,
  BulkCreateLearnerSkip,
  BulkCreateStaffLearnersInput,
  CreateStaffLearnerInput,
  LearnersProvider,
  ListStaffLearnersQuery,
  StaffLearner,
  UpdateStaffLearnerInput,
} from "@/domains/learners/types"

function normalizePhoneDigits(phone: string) {
  return phone.replace(/[^\d]/g, "")
}

function filterLearners(list: StaffLearner[], query?: ListStaffLearnersQuery) {
  let result = list
  const classId = query?.classId?.trim()
  if (classId) {
    result = result.filter((item) => item.classId === classId)
  }
  const q = query?.q?.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.phone.replace(/\s/g, "").includes(q) ||
        item.id.toLowerCase().includes(q),
    )
  }
  return result
}

export const mockLearnersProvider: LearnersProvider = {
  async list(query) {
    return filterLearners(getAdminLearners(), query)
  },

  async get(id) {
    return getLearnerById(id) ?? null
  },

  async create(input: CreateStaffLearnerInput) {
    const created = addAdminLearner({
      fullName: input.name,
      phone: input.phone,
      email: input.email,
      classId: input.classId,
      dateOfBirth: input.dateOfBirth,
      placeOfBirth: input.placeOfBirth,
    })
    LearnerEnrollmentService.recordInitial(created.id, created.classId, created.createdAt)
    const { provisionSchoolCertificateForLearner } = await import("@/lib/school-certificate-provision")
    const { classesService } = await import("@/domains/classes")
    const klass = await classesService.get(created.classId).catch(() => null)
    provisionSchoolCertificateForLearner(created, klass ?? undefined)
    return created
  },

  async createBulk(input: BulkCreateStaffLearnersInput) {
    const existingPhones = new Set(getAdminLearners().map((l) => normalizePhoneDigits(l.phone)))
    let createdCount = 0
    const skipped: BulkCreateLearnerSkip[] = []
    input.users.forEach((user, index) => {
      const phoneDigits = normalizePhoneDigits(user.phone)
      if (input.skipDuplicates !== false && phoneDigits && existingPhones.has(phoneDigits)) {
        skipped.push({ index, reason: "duplicate", phone: user.phone, email: user.email })
        return
      }
      addAdminLearner({
        fullName: user.name,
        phone: user.phone,
        email: user.email,
        classId: user.classId,
        dateOfBirth: user.dateOfBirth,
        placeOfBirth: user.placeOfBirth,
      })
      if (phoneDigits) existingPhones.add(phoneDigits)
      createdCount += 1
      const created = getAdminLearners().find(
        (l) => normalizePhoneDigits(l.phone) === phoneDigits,
      )
      if (created) {
        void import("@/lib/school-certificate-provision").then(({ provisionSchoolCertificateForLearner }) => {
          void import("@/domains/classes").then(({ classesService }) => {
            void classesService.get(created.classId).then((klass) => {
              provisionSchoolCertificateForLearner(created, klass ?? undefined)
            })
          })
        })
      }
    })
    return {
      total: input.users.length,
      createdCount,
      skippedCount: skipped.length,
      failedCount: 0,
      skipped,
      failed: [],
    }
  },

  async update(id: string, input: UpdateStaffLearnerInput) {
    const prev = getLearnerById(id)
    const patch: Parameters<typeof updateLearner>[1] = {}
    if (input.name !== undefined) patch.fullName = input.name
    if (input.phone !== undefined) patch.phone = input.phone
    if (input.classId !== undefined) patch.classId = input.classId
    if (input.dateOfBirth !== undefined) patch.dateOfBirth = input.dateOfBirth
    if (input.placeOfBirth !== undefined) patch.placeOfBirth = input.placeOfBirth
    try {
      const updated = updateLearner(id, patch)
      if (prev && input.classId && input.classId !== prev.classId) {
        LearnerEnrollmentService.recordManualClassChange(id, prev.classId, input.classId)
      }
      if (updated && input.classId && input.classId !== prev?.classId) {
        const { provisionSchoolCertificateForLearner } = await import("@/lib/school-certificate-provision")
        const { getClassById } = await import("@/services/admin-mock.service")
        provisionSchoolCertificateForLearner(updated, getClassById(input.classId) ?? undefined)
      }
      return updated
    } catch {
      return null
    }
  },

  async setActive(id: string, active: boolean) {
    try {
      return setLearnerStatus(id, active ? "active" : "suspended")
    } catch {
      return null
    }
  },

  async batchAssignClass(input: BatchAssignClassInput) {
    const { provisionSchoolCertificateForLearner } = await import("@/lib/school-certificate-provision")
    const { getClassById } = await import("@/services/admin-mock.service")
    const { isSchoolPeriodFinished } = await import("@/lib/school-period")

    for (const userId of input.userIds) {
      const prev = getLearnerById(userId)
      if (!prev || prev.classId === input.classId) continue
      const sourceClass = prev.classId ? getClassById(prev.classId) : null
      if (sourceClass && !isSchoolPeriodFinished(sourceClass)) {
        throw new Error("SCHOOL_PERIOD_NOT_FINISHED")
      }
      LearnerEnrollmentService.recordPromotion(userId, prev.classId, input.classId)
      const updated = updateLearner(userId, { classId: input.classId })
      if (updated) {
        provisionSchoolCertificateForLearner(updated, getClassById(input.classId) ?? undefined)
      }
    }
  },

  async regeneratePassword() {
    // Mock: handled via resetLearnerPin on detail page
  },

  async remove(id: string) {
    const { deleteLearner } = await import("@/services/admin-mock.service")
    const { LearnerEnrollmentService } = await import("@/services/learner-enrollment.service")
    deleteLearner(id)
    LearnerEnrollmentService.removeForLearner(id)
  },
}
