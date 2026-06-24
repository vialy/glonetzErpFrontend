"use client"

import { apiRequest } from "@/core/api/client"
import type { LoginResponse } from "@/types"
import {
  parseStaffLoginPayload,
  pickStaffProfile,
  staffProfileToSession,
  toStaffSession,
} from "@/domains/auth/staff-api-mapper"
import type { AuthProvider } from "@/domains/auth/types"

export const httpAuthProvider: AuthProvider = {
  async login(input) {
    const data = await apiRequest<unknown>("/staff/auth/login", {
      method: "POST",
      body: { email: input.email.trim().toLowerCase(), password: input.password },
    })
    const { token, staff, requiresPasswordChange } = parseStaffLoginPayload(data)
    return toStaffSession(token, staff, requiresPasswordChange, input.email.trim().toLowerCase())
  },

  async getMe(current) {
    const data = await apiRequest<unknown>("/staff/auth/me", { method: "GET" })
    const staff = pickStaffProfile(data)
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
    const requiresPasswordChange = Boolean(
      record.requiresPasswordChange ?? record.mustChangePassword ?? staff.requiresPasswordChange,
    )
    return staffProfileToSession(current, staff, requiresPasswordChange)
  },

  async changePassword(input) {
    await apiRequest<void>("/staff/auth/change-password", {
      method: "POST",
      body: { currentPassword: input.currentPassword, newPassword: input.newPassword },
    })
  },

  async requestPasswordReset(email) {
    await apiRequest<void>("/staff/auth/request-password-reset", {
      method: "POST",
      body: { email: email.trim().toLowerCase() },
    })
  },

  async resetPasswordWithCode(input) {
    await apiRequest<void>("/staff/auth/reset-password", {
      method: "POST",
      body: {
        email: input.email.trim().toLowerCase(),
        tempPassword: input.tempPassword,
        newPassword: input.newPassword,
      },
    })
  },
}
