"use client"

import { apiRequest } from "@/core/api/client"
import { parseStaffSettings } from "@/domains/settings/settings-api-mapper"
import type { SettingsProvider, StaffSettings, UpdateStaffSettingsInput } from "@/domains/settings/types"

export const httpSettingsProvider: SettingsProvider = {
  async get() {
    const data = await apiRequest<unknown>("/staff/settings", { method: "GET" })
    return parseStaffSettings(data)
  },
  async update(input: UpdateStaffSettingsInput) {
    const data = await apiRequest<unknown>("/staff/settings", {
      method: "PATCH",
      body: input,
    })
    return parseStaffSettings(data)
  },
}
