"use client"

import { httpSettingsProvider } from "@/domains/settings/providers/http"
import { mockSettingsProvider } from "@/domains/settings/providers/mock"
import type { StaffSettings, UpdateStaffSettingsInput } from "@/domains/settings/types"

const provider =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api" ? httpSettingsProvider : mockSettingsProvider

export const settingsService = {
  get(): Promise<StaffSettings> {
    return provider.get()
  },
  update(input: UpdateStaffSettingsInput): Promise<StaffSettings> {
    return provider.update(input)
  },
}
