import type { LoginResponse } from "@/types"

export interface LoginInput {
  email: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordInput {
  email: string
  tempPassword: string
  newPassword: string
}

export interface AuthProvider {
  login(input: LoginInput): Promise<LoginResponse>
  getMe(current: LoginResponse): Promise<LoginResponse>
  changePassword(input: ChangePasswordInput): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPasswordWithCode(input: ResetPasswordInput): Promise<void>
}
