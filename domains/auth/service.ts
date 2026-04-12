"use client"

import type { LoginResponse } from "@/types"
import { httpAuthProvider } from "@/domains/auth/providers/http"
import { mockAuthProvider } from "@/domains/auth/providers/mock"

const SESSION_KEY = "glonetz_session"
const ATTEMPTS_KEY = "glonetz_attempts"
const COOLDOWN_KEY = "glonetz_cooldown"
const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

const provider = (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api" ? httpAuthProvider : mockAuthProvider

export const authService = {
  async login(phone: string, pin: string): Promise<LoginResponse> {
    const response = await provider.login({ phone, pin })
    this.storeSession(response)
    return response
  },
  async changePin(currentPin: string, newPin: string): Promise<void> {
    await provider.changePin({ currentPin, newPin })
    const session = this.getSession()
    if (session) this.storeSession({ ...session, mustChangePin: false })
  },
  async requestPinReset(phone: string): Promise<void> {
    await provider.requestPinReset(phone)
  },
  async resetPinWithCode(phone: string, tempPin: string, newPin: string): Promise<void> {
    await provider.resetPinWithCode({ phone, tempPin, newPin })
  },
  async requestManagerPinSms(phone: string): Promise<void> {
    await provider.requestManagerPinSms(phone)
  },
  storeSession(response: LoginResponse) {
    if (typeof window === "undefined") return
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(response))}; path=/; max-age=86400`
  },
  getSession(): LoginResponse | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp(`(^| )${SESSION_KEY}=([^;]+)`))
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match[2]))
    } catch {
      return null
    }
  },
  clearSession() {
    if (typeof document === "undefined") return
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
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

