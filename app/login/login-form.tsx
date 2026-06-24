"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  Lock,
  Loader2,
  ShieldAlert,
  Clock,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Send,
  ShieldCheck,
  KeyRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { LanguageSwitcher } from "@/components/language-switcher"
import { StaffPasswordChangeSuccessPanel } from "@/components/staff/staff-password-change-success-panel"
import { useStaffPasswordChangeRedirect } from "@/hooks/use-staff-password-change-redirect"
import { authService } from "@/domains/auth"
import { isApiDataProvider } from "@/lib/data-provider"
import { getApiErrorMessage, isStaffPasswordStrong } from "@/lib/api-error"
import { Alert, AlertTitle } from "@/components/ui/alert"

type Step = "login" | "change-password" | "forgot-email" | "forgot-reset"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, loading, error, attemptsRemaining, cooldownEnd, mustChangePin } = useAuth()
  const { t } = useLocale()
  const { successVisible, secondsLeft, startRedirectCountdown } = useStaffPasswordChangeRedirect()

  const [step, setStep] = useState<Step>("login")
  const [showPasswordChangedBanner, setShowPasswordChangedBanner] = useState(false)
  const [showSessionExpiredBanner, setShowSessionExpiredBanner] = useState(false)
  const [animClass, setAnimClass] = useState("")
  const [skipForceChangeRedirect, setSkipForceChangeRedirect] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [shaking, setShaking] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [forgotEmail, setForgotEmail] = useState("")
  const [tempPassword, setTempPassword] = useState("")
  const [resetNewPassword, setResetNewPassword] = useState("")
  const [resetConfirmPassword, setResetConfirmPassword] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)

  const isCoolingDown = cooldownRemaining > 0

  function goToStep(next: Step) {
    setAnimClass("animate-slide-out-left")
    setTimeout(() => {
      setStep(next)
      setAnimClass("animate-slide-in-right")
    }, 350)
  }

  function returnToLoginStep(options?: { showPasswordChangedMessage?: boolean }) {
    setSkipForceChangeRedirect(true)
    if (options?.showPasswordChangedMessage) setShowPasswordChangedBanner(true)
    setStep("login")
    setAnimClass("")
    setPassword("")
    setPasswordError("")
    setForgotError("")
    setResetSuccess(false)
  }

  function goBackToLogin() {
    setSkipForceChangeRedirect(true)
    setAnimClass("animate-slide-out-left")
    setTimeout(() => {
      returnToLoginStep()
      setAnimClass("animate-slide-in-right")
    }, 350)
  }

  useEffect(() => {
    if (mustChangePin && step === "login" && !skipForceChangeRedirect) {
      goToStep("change-password")
    }
  }, [mustChangePin, step, skipForceChangeRedirect])

  useEffect(() => {
    if (searchParams.get("passwordChanged") !== "1") return
    returnToLoginStep({ showPasswordChangedMessage: true })
    router.replace("/login")
  }, [searchParams, router])

  useEffect(() => {
    if (searchParams.get("sessionExpired") !== "1") return
    setShowSessionExpiredBanner(true)
    router.replace("/login")
  }, [searchParams, router])

  useEffect(() => {
    if (cooldownEnd <= Date.now()) {
      setCooldownRemaining(0)
      return
    }
    setCooldownRemaining(Math.ceil((cooldownEnd - Date.now()) / 1000))
    const interval = setInterval(() => {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000)
      if (remaining <= 0) {
        setCooldownRemaining(0)
        authService.clearCooldown()
        clearInterval(interval)
      } else {
        setCooldownRemaining(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownEnd])

  useEffect(() => {
    if (error && step === "login") {
      setShaking(true)
      const timer = setTimeout(() => setShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [error, step])

  const handleLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (loading || isCoolingDown) return
      setEmailError("")
      if (!isValidEmail(email)) {
        setEmailError(t("staff_email_invalid"))
        return
      }
      if (password.length < 6) {
        setEmailError(t("staff_password_min"))
        return
      }
      setSkipForceChangeRedirect(false)
      login(email.trim().toLowerCase(), password)
    },
    [email, password, login, loading, isCoolingDown, t],
  )

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setPasswordError("")
      const minLen = isApiDataProvider() ? 8 : 6
      if (
        currentPassword.length < minLen ||
        newPassword.length < minLen ||
        confirmPassword.length < minLen
      ) {
        setPasswordError(isApiDataProvider() ? t("staff_password_policy") : t("staff_password_min"))
        return
      }
      if (isApiDataProvider() && !isStaffPasswordStrong(newPassword)) {
        setPasswordError(t("staff_password_policy"))
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError(t("staff_password_mismatch"))
        return
      }
      if (newPassword === currentPassword) {
        setPasswordError(t("staff_password_same"))
        return
      }
      setPasswordError("")
      try {
        await authService.changePassword(currentPassword, newPassword)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        startRedirectCountdown()
      } catch (err) {
        setPasswordError(getApiErrorMessage(err, t("staff_password_policy")))
      }
    },
    [currentPassword, newPassword, confirmPassword, startRedirectCountdown, t],
  )

  const handleRequestReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setForgotError("")
      if (!isValidEmail(forgotEmail)) {
        setForgotError(t("staff_email_invalid"))
        return
      }
      setForgotLoading(true)
      try {
        await authService.requestPasswordReset(forgotEmail.trim().toLowerCase())
        goToStep("forgot-reset")
      } catch {
        setForgotError(t("staff_reset_error"))
      } finally {
        setForgotLoading(false)
      }
    },
    [forgotEmail, t],
  )

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setForgotError("")
      if (resetNewPassword !== resetConfirmPassword) {
        setForgotError(t("staff_password_mismatch"))
        return
      }
      if (resetNewPassword === tempPassword) {
        setForgotError(t("staff_password_same_temp"))
        return
      }
      setForgotLoading(true)
      try {
        await authService.resetPasswordWithCode(
          forgotEmail.trim().toLowerCase(),
          tempPassword,
          resetNewPassword,
        )
        setResetSuccess(true)
      } catch (err) {
        const code = err instanceof Error ? err.message : ""
        if (code === "PASSWORD_SAME_AS_TEMP") setForgotError(t("staff_password_same_temp"))
        else if (code === "PASSWORD_SAME_AS_CURRENT") setForgotError(t("staff_password_same"))
        else if (code === "PASSWORD_RESET_INVALID_TEMP") setForgotError(t("staff_wrong_credentials"))
        else setForgotError(t("staff_reset_error"))
      } finally {
        setForgotLoading(false)
      }
    },
    [forgotEmail, tempPassword, resetNewPassword, resetConfirmPassword, t],
  )

  const cooldownProgress = isCoolingDown ? 1 - cooldownRemaining / authService.cooldownSeconds : 0
  const circumference = 2 * Math.PI * 20

  return (
    <div className="flex h-full min-h-dvh flex-col overflow-hidden px-4 pt-24 pb-2 sm:px-8 sm:pt-28 md:px-12 lg:min-h-0 lg:justify-start lg:bg-card lg:px-16 lg:pt-14 lg:pb-3">
      <div className="absolute right-4 top-4 z-10 lg:right-6 lg:top-6">
        <LanguageSwitcher />
      </div>

      <div className="flex justify-center pt-1.5 pb-1">
        <Image
          src="/images/logo.png"
          alt="Glonetz"
          width={220}
          height={80}
          className="h-24 w-auto sm:h-24 lg:h-18"
          priority
        />
      </div>

      <div className="relative mx-auto w-full max-w-md flex-1 min-h-0 overflow-x-hidden overflow-y-hidden">
        {step === "login" && (
          <form onSubmit={handleLogin} className={`flex h-full flex-col justify-start gap-3.5 py-0.5 ${animClass}`}>
            {showPasswordChangedBanner ? (
              <Alert className="border-primary/30 bg-primary/5 text-foreground">
                <CheckCircle2 className="text-primary" />
                <AlertTitle className="text-foreground leading-snug">{t("staff_password_changed_success")}</AlertTitle>
              </Alert>
            ) : null}

            {showSessionExpiredBanner ? (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-foreground">
                <ShieldAlert className="text-amber-600" />
                <AlertTitle className="text-foreground leading-snug">{t("staff_session_expired")}</AlertTitle>
              </Alert>
            ) : null}

            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("login_title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("staff_login_subtitle")}</p>
            </div>

            {error === "INVALID_CREDENTIALS" && !isCoolingDown && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <ShieldAlert className="size-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">{t("staff_wrong_credentials")}</p>
                  <p className="mt-0.5 text-xs text-destructive/80">
                    {attemptsRemaining} {t("attempts_remaining")}
                  </p>
                </div>
              </div>
            )}

            {isCoolingDown && (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-6">
                <div className="relative flex items-center justify-center">
                  <svg className="size-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" className="stroke-accent/20" />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="stroke-primary transition-all duration-1000"
                      style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: circumference * (1 - cooldownProgress),
                      }}
                    />
                  </svg>
                  <Clock className="absolute size-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{t("too_many_attempts")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("cooldown_message")} <span className="font-bold text-primary">{cooldownRemaining}</span>{" "}
                    {t("cooldown_seconds")}
                  </p>
                </div>
              </div>
            )}

            <div className={`flex flex-col gap-3.5 ${shaking ? "animate-shake" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("staff_email_label")}
                  <span className="text-destructive"> *</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("staff_email_placeholder")}
                    disabled={isCoolingDown}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("staff_password_label")}
                  <span className="text-destructive"> *</span>
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isCoolingDown}
                    className="h-11 pl-10"
                  />
                </div>
              </div>
              {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
            </div>

            <div className="text-center">
              {!isApiDataProvider() ? (
                <button
                  type="button"
                  onClick={() => goToStep("forgot-email")}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("staff_forgot_password_link")}
                </button>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={loading || isCoolingDown || !isValidEmail(email) || password.length < 6}
              className="h-12 w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  {t("login_loading")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="size-4" />
                  {t("login_button")}
                </span>
              )}
            </Button>
          </form>
        )}

        {step === "change-password" && (
          successVisible ? (
            <div className={`flex flex-col justify-center gap-4 py-3 ${animClass}`}>
              <StaffPasswordChangeSuccessPanel secondsLeft={secondsLeft} />
            </div>
          ) : (
          <form onSubmit={handleChangePassword} className={`flex flex-col justify-center gap-4 py-3 ${animClass}`}>
            {!mustChangePin ? (
              <button
                type="button"
                onClick={goBackToLogin}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                {t("back_to_login")}
              </button>
            ) : null}

            <div className="rounded-2xl bg-gradient-to-br from-primary to-accent px-4 py-4 text-primary-foreground">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/20">
                <KeyRound className="size-6" />
              </div>
              <h2 className="mt-2 text-base font-bold">{t("staff_change_password_title")}</h2>
              <p className="mt-1 text-sm text-primary-foreground/80">{t("staff_change_password_sub")}</p>
            </div>

            {passwordError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {passwordError}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>{t("staff_current_password")}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("staff_new_password")}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("staff_confirm_password")}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <Button type="submit" disabled={loading || currentPassword.length < 6 || newPassword.length < 6}>
              {loading ? t("staff_changing_password") : t("staff_change_password_button")}
            </Button>
          </form>
          )
        )}

        {step === "forgot-email" && (
          <form onSubmit={handleRequestReset} className={`flex flex-col justify-center gap-6 py-6 ${animClass}`}>
            <button type="button" onClick={goBackToLogin} className="flex items-center gap-1.5 self-start text-sm text-muted-foreground">
              <ArrowLeft className="size-4" />
              {t("back_to_login")}
            </button>

            <div className="rounded-2xl bg-gradient-to-br from-primary to-accent px-5 py-5 text-primary-foreground">
              <h2 className="text-lg font-bold">{t("staff_forgot_password_title")}</h2>
              <p className="mt-1.5 text-sm text-primary-foreground/80">{t("staff_forgot_password_sub")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgot-email">{t("staff_email_label")}</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={t("staff_email_placeholder")}
              />
            </div>
            {forgotError ? <p className="text-sm text-destructive">{forgotError}</p> : null}

            <Button type="submit" disabled={forgotLoading || !isValidEmail(forgotEmail)}>
              {forgotLoading ? t("staff_sending_reset") : (
                <span className="flex items-center gap-2">
                  <Send className="size-4" />
                  {t("staff_send_reset")}
                </span>
              )}
            </Button>
          </form>
        )}

        {step === "forgot-reset" && (
          <div className={`flex flex-col justify-center gap-4 py-4 ${animClass}`}>
            <button type="button" onClick={goBackToLogin} className="flex items-center gap-1.5 self-start text-sm text-muted-foreground">
              <ArrowLeft className="size-4" />
              {t("back_to_login")}
            </button>

            {resetSuccess ? (
              <div className="space-y-4 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 px-5 py-5 text-white">
                  <CheckCircle2 className="mx-auto size-10" />
                  <h2 className="mt-3 text-lg font-bold">{t("staff_reset_success_title")}</h2>
                  <p className="mt-1 text-sm text-white/85">{t("staff_reset_success_sub")}</p>
                </div>
                <Button onClick={goBackToLogin} className="w-full">
                  {t("login_button")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div className="rounded-2xl bg-gradient-to-br from-primary to-accent px-5 py-5 text-primary-foreground">
                  <ShieldCheck className="size-8" />
                  <h2 className="mt-2 text-lg font-bold">{t("staff_reset_code_title")}</h2>
                  <p className="mt-1 text-sm text-primary-foreground/80">
                    {t("staff_reset_code_sub")} <span className="font-semibold">{forgotEmail}</span>
                  </p>
                </div>

                {forgotError ? <p className="text-sm text-destructive">{forgotError}</p> : null}

                <div className="space-y-2">
                  <Label>{t("staff_temp_password")}</Label>
                  <Input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("staff_new_password")}</Label>
                  <Input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("staff_confirm_password")}</Label>
                  <Input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={forgotLoading || tempPassword.length < 6 || resetNewPassword.length < 6}>
                  {forgotLoading ? t("staff_resetting") : t("staff_reset_button")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
