import type { LoginResponse, UserRole } from "@/types"

export const SESSION_KEY = "glonetz_staff_session"
const ATTEMPTS_KEY = "glonetz_staff_attempts"
const COOLDOWN_KEY = "glonetz_staff_cooldown"
const PASSWORD_RESET_TEMP_KEY = "glonetz_staff_password_reset_temp"
export const ACCOUNTS_STORAGE_KEY = "glonetz_staff_auth_accounts_v3"
const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

type AccountOverride = { password?: string; mustChangePassword?: boolean }

type StaffMockAccount = {
  password: string
  role: UserRole
  staffUserId: string
  phone: string
  mustChangePassword: boolean
}

const MOCK_ACCOUNTS: Record<string, StaffMockAccount> = {
  "admin@glonetz.cm": {
    password: "Admin1234",
    role: "admin",
    staffUserId: "u1",
    phone: "+237600000000",
    mustChangePassword: false,
  },
  "manager@glonetz.cm": {
    password: "Manager5678",
    role: "manager",
    staffUserId: "u2",
    phone: "+237600000002",
    mustChangePassword: false,
  },
  "comptable@glonetz.cm": {
    password: "Compta2468",
    role: "accountant",
    staffUserId: "u3",
    phone: "+237600000003",
    mustChangePassword: false,
  },
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function readOverrides(): Record<string, AccountOverride> {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, AccountOverride>) : {}
  } catch {
    return {}
  }
}

function writeOverrides(next: Record<string, AccountOverride>) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next))
}

function setAccountOverride(email: string, patch: AccountOverride) {
  const key = normalizeEmail(email)
  const all = readOverrides()
  all[key] = { ...all[key], ...patch }
  writeOverrides(all)
}

function getMergedAccount(email: string) {
  const key = normalizeEmail(email)
  const base = MOCK_ACCOUNTS[key]
  if (!base) return null
  const o = readOverrides()[key]
  return {
    password: o?.password ?? base.password,
    role: base.role,
    staffUserId: base.staffUserId,
    phone: base.phone,
    mustChangePassword: o?.mustChangePassword ?? base.mustChangePassword,
  }
}

function randomTempPassword(): string {
  return `Tmp${String(1000 + Math.floor(Math.random() * 9000))}!`
}

export type ClearAuthBrowserStateOptions = {
  clearMockPinOverrides?: boolean
}

export function clearAuthBrowserState(options?: ClearAuthBrowserStateOptions): void {
  const clearAccounts = options?.clearMockPinOverrides !== false
  if (typeof document !== "undefined") {
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ATTEMPTS_KEY)
    sessionStorage.removeItem(COOLDOWN_KEY)
    sessionStorage.removeItem(PASSWORD_RESET_TEMP_KEY)
  }
  if (clearAccounts && typeof localStorage !== "undefined") {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
  }
}

export const AuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    await delay(800)

    const account = getMergedAccount(email)
    if (!account || account.password !== password || account.role === "student") {
      throw new Error("INVALID_CREDENTIALS")
    }

    return {
      token: `mock_token_${Date.now()}`,
      role: account.role,
      mustChangePin: account.mustChangePassword,
      email: normalizeEmail(email),
      phone: account.phone,
      staffUserId: account.staffUserId,
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await delay(600)
    const session = this.getSession()
    const email = session?.email
    if (!email) throw new Error("PASSWORD_CHANGE_FAILED")

    const acc = getMergedAccount(email)
    if (!acc || acc.password !== currentPassword) throw new Error("PASSWORD_CHANGE_FAILED")
    if (newPassword.length < 6 || newPassword === currentPassword) {
      throw new Error("PASSWORD_CHANGE_FAILED")
    }

    setAccountOverride(email, { password: newPassword, mustChangePassword: false })
  },

  /** @deprecated Conservé pour compat — redirige vers changePassword. */
  async changePin(currentPin: string, newPin: string): Promise<void> {
    return this.changePassword(currentPin, newPin)
  },

  async requestPasswordReset(email: string): Promise<void> {
    await delay(1000)
    const acc = getMergedAccount(email)
    if (!acc) return

    const tempPassword = randomTempPassword()
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        PASSWORD_RESET_TEMP_KEY,
        JSON.stringify({ email: normalizeEmail(email), tempPassword, createdAt: Date.now() }),
      )
    }
    console.info(`[Glonetz email mock] Mot de passe temporaire pour ${normalizeEmail(email)}: ${tempPassword}`)
  },

  /** @deprecated Alias historique. */
  async requestPinReset(email: string): Promise<void> {
    return this.requestPasswordReset(email)
  },

  async resetPasswordWithCode(email: string, tempPassword: string, newPassword: string): Promise<void> {
    await delay(800)

    const acc = getMergedAccount(email)
    if (!acc) throw new Error("PASSWORD_RESET_FAILED")
    if (newPassword.length < 6) throw new Error("PASSWORD_RESET_FAILED")
    if (newPassword === tempPassword) throw new Error("PASSWORD_SAME_AS_TEMP")
    if (newPassword === acc.password) throw new Error("PASSWORD_SAME_AS_CURRENT")

    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(PASSWORD_RESET_TEMP_KEY)
      if (!raw) throw new Error("PASSWORD_RESET_INVALID_TEMP")
      try {
        const pending = JSON.parse(raw) as { email?: string; tempPassword?: string }
        if (pending.email !== normalizeEmail(email) || pending.tempPassword !== tempPassword) {
          throw new Error("PASSWORD_RESET_INVALID_TEMP")
        }
      } catch (e) {
        if (e instanceof Error && e.message === "PASSWORD_RESET_INVALID_TEMP") throw e
        throw new Error("PASSWORD_RESET_INVALID_TEMP")
      }
      sessionStorage.removeItem(PASSWORD_RESET_TEMP_KEY)
    }

    setAccountOverride(email, { password: newPassword, mustChangePassword: false })
  },

  /** @deprecated Alias historique. */
  async resetPinWithCode(email: string, tempPassword: string, newPassword: string): Promise<void> {
    return this.resetPasswordWithCode(email, tempPassword, newPassword)
  },

  storeSession(response: LoginResponse) {
    if (typeof window === "undefined") return
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(
      JSON.stringify(response),
    )}; path=/; max-age=86400`
  },

  getSession(): LoginResponse | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(
      new RegExp("(^| )" + SESSION_KEY + "=([^;]+)"),
    )
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match[2])) as LoginResponse
    } catch {
      return null
    }
  },

  clearSession() {
    clearAuthBrowserState()
  },

  getAttempts(): number {
    if (typeof sessionStorage === "undefined") return MAX_ATTEMPTS
    const val = sessionStorage.getItem(ATTEMPTS_KEY)
    return val ? parseInt(val, 10) : MAX_ATTEMPTS
  },

  decrementAttempts(): number {
    const remaining = this.getAttempts() - 1
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(ATTEMPTS_KEY, String(remaining))
    }
    return remaining
  },

  resetAttempts() {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS))
  },

  setCooldown() {
    const end = Date.now() + COOLDOWN_SECONDS * 1000
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(COOLDOWN_KEY, String(end))
  },

  getCooldownEnd(): number {
    if (typeof sessionStorage === "undefined") return 0
    const val = sessionStorage.getItem(COOLDOWN_KEY)
    return val ? parseInt(val, 10) : 0
  },

  clearCooldown() {
    if (typeof sessionStorage === "undefined") return
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
