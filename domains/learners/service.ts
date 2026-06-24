"use client"

import { isApiDataProvider } from "@/lib/data-provider"
import { httpLearnersProvider } from "@/domains/learners/providers/http"
import { mockLearnersProvider } from "@/domains/learners/providers/mock"
import type {
  BatchAssignClassInput,
  BulkCreateStaffLearnersInput,
  BulkCreateStaffLearnersResult,
  CreateStaffLearnerInput,
  ListStaffLearnersQuery,
  StaffLearner,
  UpdateStaffLearnerInput,
} from "@/domains/learners/types"

const provider = isApiDataProvider() ? httpLearnersProvider : mockLearnersProvider

export const learnersService = {
  list(query?: ListStaffLearnersQuery): Promise<StaffLearner[]> {
    return provider.list(query)
  },

  get(id: string): Promise<StaffLearner | null> {
    return provider.get(id)
  },

  create(input: CreateStaffLearnerInput): Promise<StaffLearner> {
    return provider.create(input)
  },

  createBulk(input: BulkCreateStaffLearnersInput): Promise<BulkCreateStaffLearnersResult> {
    return provider.createBulk(input)
  },

  update(id: string, input: UpdateStaffLearnerInput): Promise<StaffLearner | null> {
    return provider.update(id, input)
  },

  setActive(id: string, active: boolean): Promise<StaffLearner | null> {
    return provider.setActive(id, active)
  },

  batchAssignClass(input: BatchAssignClassInput): Promise<void> {
    return provider.batchAssignClass(input)
  },

  regeneratePassword(id: string): Promise<void> {
    return provider.regeneratePassword(id)
  },
}
