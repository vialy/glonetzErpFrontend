"use client"

import {
  addAdminClass,
  getAdminClasses,
  getClassById,
  updateAdminClass,
} from "@/services/admin-mock.service"
import type {
  ClassesProvider,
  CreateStaffClassInput,
  ListStaffClassesQuery,
  StaffClass,
  UpdateStaffClassInput,
} from "@/domains/classes/types"

function filterClasses(list: StaffClass[], query?: ListStaffClassesQuery) {
  const q = query?.q?.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.session.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
  )
}

export const mockClassesProvider: ClassesProvider = {
  async list(query) {
    return filterClasses(getAdminClasses(), query)
  },

  async get(id) {
    return getClassById(id) ?? null
  },

  async getDetails() {
    // Pas de rollup serveur en mode mock : la page calcule localement.
    return null
  },

  async create(input: CreateStaffClassInput) {
    return addAdminClass(input)
  },

  async update(id: string, input: UpdateStaffClassInput) {
    return updateAdminClass(id, input) ?? null
  },
}
