"use client"

import { isApiDataProvider } from "@/lib/data-provider"
import { httpClassesProvider } from "@/domains/classes/providers/http"
import { mockClassesProvider } from "@/domains/classes/providers/mock"
import type {
  CreateStaffClassInput,
  ListStaffClassesQuery,
  StaffClass,
  StaffClassDetails,
  UpdateStaffClassInput,
} from "@/domains/classes/types"

const provider = isApiDataProvider() ? httpClassesProvider : mockClassesProvider

export const classesService = {
  list(query?: ListStaffClassesQuery): Promise<StaffClass[]> {
    return provider.list(query)
  },

  get(id: string): Promise<StaffClass | null> {
    return provider.get(id)
  },

  getDetails(id: string): Promise<StaffClassDetails | null> {
    return provider.getDetails(id)
  },

  create(input: CreateStaffClassInput): Promise<StaffClass> {
    return provider.create(input)
  },

  update(id: string, input: UpdateStaffClassInput): Promise<StaffClass | null> {
    return provider.update(id, input)
  },
}
