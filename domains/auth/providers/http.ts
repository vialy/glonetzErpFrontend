"use client"

import type { LoginResponse } from "@/types"
import { apiRequest } from "@/core/api/client"
import type { AuthProvider, ChangePinInput, LoginInput, ResetPinInput } from "@/domains/auth/types"

export const httpAuthProvider: AuthProvider = {
  async login(input: LoginInput) {
    return apiRequest<LoginResponse>("/auth/login", { method: "POST", body: input })
  },
  async changePin(input: ChangePinInput) {
    await apiRequest<void>("/auth/change-pin", { method: "POST", body: input })
  },
  async requestPinReset(phone: string) {
    await apiRequest<void>("/auth/request-pin-reset", { method: "POST", body: { phone } })
  },
  async resetPinWithCode(input: ResetPinInput) {
    await apiRequest<void>("/auth/reset-pin", { method: "POST", body: input })
  },
  async requestManagerPinSms(phone: string) {
    await apiRequest<void>("/auth/manager/request-pin-sms", { method: "POST", body: { phone } })
  },
}

