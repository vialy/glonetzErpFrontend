"use client"

import {
  addAdminLearner,
  getAdminLearners,
  getLearnerById,
  setLearnerStatus,
  updateLearner,
} from "@/services/admin-mock.service"
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
    return addAdminLearner({
      fullName: input.name,
      phone: input.phone,
      email: input.email,
      classId: input.classId,
    })
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
      })
      if (phoneDigits) existingPhones.add(phoneDigits)
      createdCount += 1
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
    const patch: Parameters<typeof updateLearner>[1] = {}
    if (input.name !== undefined) patch.fullName = input.name
    if (input.phone !== undefined) patch.phone = input.phone
    if (input.classId !== undefined) patch.classId = input.classId
    try {
      return updateLearner(id, patch)
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
    for (const userId of input.userIds) {
      updateLearner(userId, { classId: input.classId })
    }
  },

  async regeneratePassword() {
    // Mock: handled via resetLearnerPin on detail page
  },
}
