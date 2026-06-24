"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { ApiClientError } from "@/core/api/client"
import { STAFF_SESSION_EXPIRED_EVENT } from "@/core/api/unauthorized"
import { authService } from "@/domains/auth"
import { clearAllCached } from "@/lib/client-cache"
import type { LoginResponse } from "@/types"

type AuthStatus = "loading" | "authenticated" | "anonymous"

type AuthContextValue = {
  status: AuthStatus
  session: LoginResponse | null
  isAuthenticated: boolean
  role: LoginResponse["role"] | null
  email: string | null
  phone: string | null
  fullName: string | null
  mustChangePin: boolean
  loading: boolean
  error: string | null
  attemptsRemaining: number
  cooldownEnd: number
  login: (email: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  logout: (redirectTo?: string) => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isAuthFailure(error: unknown) {
  if (error instanceof ApiClientError) return true
  if (error instanceof Error) {
    return error.message === "INVALID_CREDENTIALS" || error.message === "NO_SESSION"
  }
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [session, setSession] = useState<LoginResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState(authService.getAttempts())
  const [cooldownEnd, setCooldownEnd] = useState(authService.getCooldownEnd())

  const applySession = useCallback((next: LoginResponse | null) => {
    setSession(next)
    setStatus(next ? "authenticated" : "anonymous")
  }, [])

  const refreshSession = useCallback(async () => {
    const local = authService.getSession()
    if (!local?.token) {
      applySession(null)
      return
    }

    if (authService.isApiMode()) {
      try {
        const refreshed = await authService.refreshSession()
        applySession(refreshed)
      } catch {
        authService.clearSession()
        applySession(null)
      }
      return
    }

    applySession(local)
  }, [applySession])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  useEffect(() => {
    const onSessionExpired = () => applySession(null)
    window.addEventListener(STAFF_SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(STAFF_SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [applySession])

  useEffect(() => {
    const end = authService.getCooldownEnd()
    if (end > Date.now()) {
      setCooldownEnd(end)
    } else if (end > 0) {
      authService.clearCooldown()
      setAttemptsRemaining(authService.maxAttempts)
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setLoading(true)

      try {
        const response = await authService.login(email, password)
        if (response.role === "student") {
          authService.clearSession()
          applySession(null)
          throw new Error("INVALID_CREDENTIALS")
        }

        authService.resetAttempts()
        setAttemptsRemaining(authService.maxAttempts)
        applySession(response)

        if (!response.mustChangePin) {
          const next =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("next")
              : null
          const safeNext = next?.startsWith("/dashboard") ? next : "/dashboard"
          router.push(safeNext)
        }
      } catch (err) {
        if (!isAuthFailure(err)) {
          applySession(null)
          authService.clearSession()
        }

        const remaining = authService.decrementAttempts()
        setAttemptsRemaining(remaining)

        if (remaining <= 0) {
          authService.setCooldown()
          setCooldownEnd(authService.getCooldownEnd())
          setError("TOO_MANY_ATTEMPTS")
        } else {
          setError("INVALID_CREDENTIALS")
        }
      } finally {
        setLoading(false)
      }
    },
    [applySession, router],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      setError(null)
      setLoading(true)
      try {
        await authService.changePassword(currentPassword, newPassword)
        return true
      } catch {
        setError("PASSWORD_CHANGE_FAILED")
        return false
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const logout = useCallback((redirectTo = "/login") => {
    authService.clearSession()
    clearAllCached()
    applySession(null)
    router.replace(redirectTo)
  }, [applySession, router])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      isAuthenticated: session !== null,
      role: session?.role ?? null,
      email: session?.email ?? null,
      phone: session?.phone ?? null,
      fullName: session?.fullName ?? null,
      mustChangePin: session?.mustChangePin ?? false,
      loading,
      error,
      attemptsRemaining,
      cooldownEnd,
      login,
      changePassword,
      logout,
      refreshSession,
    }),
    [
      status,
      session,
      loading,
      error,
      attemptsRemaining,
      cooldownEnd,
      login,
      changePassword,
      logout,
      refreshSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
