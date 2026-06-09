"use client"

import type { SettingsProvider, StaffSettings, UpdateStaffSettingsInput } from "@/domains/settings/types"

const STORAGE_KEY = "glonetz_staff_settings_v1"

const DEFAULT_SETTINGS: StaffSettings = {
  id: "settings-demo-001",
  activeGateway: "monero",
  notificationEmails: ["ops@glonez.local"],
  createdAt: "2024-05-26T11:28:36.292Z",
  updatedAt: new Date().toISOString(),
}

function read(): StaffSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as StaffSettings
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notificationEmails: Array.isArray(parsed.notificationEmails)
        ? parsed.notificationEmails
        : DEFAULT_SETTINGS.notificationEmails,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function write(next: StaffSettings) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("staff-settings-updated"))
}

export const mockSettingsProvider: SettingsProvider = {
  async get() {
    return read()
  },
  async update(input: UpdateStaffSettingsInput) {
    const current = read()
    const next: StaffSettings = {
      ...current,
      activeGateway: input.activeGateway,
      notificationEmails: input.notificationEmails,
      updatedAt: new Date().toISOString(),
    }
    write(next)
    return next
  },
}
