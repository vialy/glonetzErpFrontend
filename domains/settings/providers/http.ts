"use client"

import { apiRequest } from "@/core/api/client"
import type { SettingsProvider, StaffSettings, UpdateStaffSettingsInput } from "@/domains/settings/types"

type SettingsApiEnvelope = {
  success: boolean
  data?: { settings: StaffSettings }
  errorMsg?: string
  errorCode?: number
}

function unwrapSettings(payload: SettingsApiEnvelope): StaffSettings {
  if (!payload.success || !payload.data?.settings) {
    throw new Error(payload.errorMsg || "SETTINGS_LOAD_FAILED")
  }
  return payload.data.settings
}

export const httpSettingsProvider: SettingsProvider = {
  async get() {
    const payload = await apiRequest<SettingsApiEnvelope>("/staff/settings", { method: "GET" })
    return unwrapSettings(payload)
  },
  async update(input: UpdateStaffSettingsInput) {
    const payload = await apiRequest<SettingsApiEnvelope>("/staff/settings", {
      method: "PATCH",
      body: input,
    })
    return unwrapSettings(payload)
  },
}
