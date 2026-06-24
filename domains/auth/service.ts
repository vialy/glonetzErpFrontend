"use client"

import type { LoginResponse } from "@/types"
import { isApiDataProvider } from "@/lib/data-provider"
import { clearAuthBrowserState, SESSION_KEY, type ClearAuthBrowserStateOptions } from "@/services/auth.service"
import { httpAuthProvider } from "@/domains/auth/providers/http"
import { mockAuthProvider } from "@/domains/auth/providers/mock"

const ATTEMPTS_KEY = "glonetz_staff_attempts"
const COOLDOWN_KEY = "glonetz_staff_cooldown"
const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

const provider = isApiDataProvider() ? httpAuthProvider : mockAuthProvider

export const authService = {
  isApiMode: isApiDataProvider,

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await provider.login({ email, password })
    this.storeSession(response)

    if (isApiDataProvider()) {
      try {
        return (await this.refreshSession()) ?? response
      } catch {
        return response
      }
    }

    return response
  },

  async refreshSession(): Promise<LoginResponse | null> {
    const current = this.getSession()
    if (!current?.token) return null

    const refreshed = await provider.getMe(current)
    const next = { ...current, ...refreshed, token: current.token }
    this.storeSession(next)
    return next
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await provider.changePassword({ currentPassword, newPassword })
    const session = this.getSession()
    if (session) this.storeSession({ ...session, mustChangePin: false })
  },

  /** @deprecated */
  async changePin(currentPin: string, newPin: string): Promise<void> {
    return this.changePassword(currentPin, newPin)
  },

  async requestPasswordReset(email: string): Promise<void> {
    await provider.requestPasswordReset(email)
  },

  /** @deprecated */
  async requestPinReset(email: string): Promise<void> {
    return this.requestPasswordReset(email)
  },

  async resetPasswordWithCode(email: string, tempPassword: string, newPassword: string): Promise<void> {
    await provider.resetPasswordWithCode({ email, tempPassword, newPassword })
  },

  /** @deprecated */
  async resetPinWithCode(email: string, tempPassword: string, newPassword: string): Promise<void> {
    return this.resetPasswordWithCode(email, tempPassword, newPassword)
  },

  storeSession(response: LoginResponse) {
    if (typeof window === "undefined") return
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(response))}; path=/; max-age=86400; SameSite=Lax${secure}`
  },

  getSession(): LoginResponse | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp(`(^| )${SESSION_KEY}=([^;]+)`))
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match[2])) as LoginResponse
    } catch {
      return null
    }
  },

  clearSession(options?: ClearAuthBrowserStateOptions) {
    clearAuthBrowserState(options)
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null
  },

  getAttempts(): number {
    if (typeof sessionStorage === "undefined") return MAX_ATTEMPTS
    const val = sessionStorage.getItem(ATTEMPTS_KEY)
    return val ? parseInt(val, 10) : MAX_ATTEMPTS
  },

  decrementAttempts(): number {
    const remaining = this.getAttempts() - 1
    sessionStorage.setItem(ATTEMPTS_KEY, String(remaining))
    return remaining
  },

  resetAttempts() {
    sessionStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS))
  },

  setCooldown() {
    const end = Date.now() + COOLDOWN_SECONDS * 1000
    sessionStorage.setItem(COOLDOWN_KEY, String(end))
  },

  getCooldownEnd(): number {
    if (typeof sessionStorage === "undefined") return 0
    const val = sessionStorage.getItem(COOLDOWN_KEY)
    return val ? parseInt(val, 10) : 0
  },

  clearCooldown() {
    sessionStorage.removeItem(COOLDOWN_KEY)
    this.resetAttempts()
  },

  get maxAttempts() {
    return MAX_ATTEMPTS
  },

  get cooldownSeconds() {
    return COOLDOWN_SECONDS
  },
}
