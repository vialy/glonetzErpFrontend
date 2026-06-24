"use client"

import { AuthService } from "@/services/auth.service"
import type { AuthProvider } from "@/domains/auth/types"

export const mockAuthProvider: AuthProvider = {
  async login(input) {
    return AuthService.login(input.email, input.password)
  },
  async getMe(current) {
    return current
  },
  async changePassword(input) {
    return AuthService.changePassword(input.currentPassword, input.newPassword)
  },
  async requestPasswordReset(email) {
    return AuthService.requestPasswordReset(email)
  },
  async resetPasswordWithCode(input) {
    return AuthService.resetPasswordWithCode(input.email, input.tempPassword, input.newPassword)
  },
}
