"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  Lock, Loader2, ShieldAlert, Clock, KeyRound,
  ShieldCheck, ArrowLeft, MessageSquare, CheckCircle2, Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PhoneInputField } from "@/components/ui/phone-input"
import { formatPhoneE164, validatePhoneE164 } from "@/lib/phone-validation"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { LanguageSwitcher } from "@/components/language-switcher"
import { authService } from "@/domains/auth"
import { Alert, AlertTitle } from "@/components/ui/alert"

type Step = "login" | "change-pin" | "forgot-phone" | "forgot-reset"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, changePin, loading, error, attemptsRemaining, cooldownEnd, mustChangePin } = useAuth()
  const { t } = useLocale()

  const [step, setStep] = useState<Step>("login")
  const [showPinSmsBanner, setShowPinSmsBanner] = useState(false)
  const [showPinChangedBanner, setShowPinChangedBanner] = useState(false)
  const [animClass, setAnimClass] = useState("")
  const [skipForceChangePinRedirect, setSkipForceChangePinRedirect] = useState(false)

  // Login fields
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [shaking, setShaking] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Change PIN fields
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinError, setPinError] = useState("")

  // Forgot PIN fields
  const [forgotPhone, setForgotPhone] = useState("")
  const [tempPin, setTempPin] = useState("")
  const [resetNewPin, setResetNewPin] = useState("")
  const [resetConfirmPin, setResetConfirmPin] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)

  const isCoolingDown = cooldownRemaining > 0

  // Slide transition helper
  function goToStep(next: Step) {
    setAnimClass("animate-slide-out-left")
    setTimeout(() => {
      setStep(next)
      setAnimClass("animate-slide-in-right")
    }, 350)
  }

  function resetLoginFields() {
    setPin("")
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
    setPinError("")
    setForgotPhone("")
    setTempPin("")
    setResetNewPin("")
    setResetConfirmPin("")
    setForgotError("")
    setPhoneError("")
    setResetSuccess(false)
  }

  function returnToLoginStep(options?: { showPinChangedMessage?: boolean }) {
    setSkipForceChangePinRedirect(true)
    if (options?.showPinChangedMessage) setShowPinChangedBanner(true)
    setStep("login")
    setAnimClass("")
    resetLoginFields()
  }

  function goBackToLogin() {
    setSkipForceChangePinRedirect(true)
    setAnimClass("animate-slide-out-left")
    setTimeout(() => {
      returnToLoginStep()
      setAnimClass("animate-slide-in-right")
    }, 350)
  }

  // Transition to change-pin when mustChangePin becomes true
  useEffect(() => {
    if (mustChangePin && step === "login" && !skipForceChangePinRedirect) {
      goToStep("change-pin")
    }
  }, [mustChangePin, step, skipForceChangePinRedirect])

  useEffect(() => {
    if (searchParams.get("pinSms") !== "1") return
    setShowPinSmsBanner(true)
    returnToLoginStep()
    router.replace("/login")
  }, [searchParams, router])

  useEffect(() => {
    if (searchParams.get("pinChanged") !== "1") return
    returnToLoginStep({ showPinChangedMessage: true })
    router.replace("/login")
  }, [searchParams, router])

  // Cooldown timer
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

  // Shake on login error
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
      setPhoneError("")
      if (!validatePhoneE164(phone)) {
        setPhoneError(t("phone_invalid_format"))
        return
      }
      setSkipForceChangePinRedirect(false)
      login(formatPhoneE164(phone), pin)
    },
    [phone, pin, login, loading, isCoolingDown, t]
  )

  const handleChangePin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setPinError("")
      if (newPin !== confirmPin) {
        setPinError(t("pins_dont_match"))
        return
      }
      if (newPin === currentPin) {
        setPinError(t("pin_same_as_current"))
        return
      }
      const ok = await changePin(currentPin, newPin)
      if (ok) {
        returnToLoginStep({ showPinChangedMessage: true })
      }
    },
    [currentPin, newPin, confirmPin, changePin, t]
  )

  const handleRequestSms = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setForgotError("")
      if (!validatePhoneE164(forgotPhone)) {
        setForgotError(t("phone_invalid_format"))
        return
      }
      setForgotLoading(true)
      try {
        await authService.requestPinReset(formatPhoneE164(forgotPhone))
        goToStep("forgot-reset")
      } catch {
        setForgotError("Erreur")
      } finally {
        setForgotLoading(false)
      }
    },
    [forgotPhone, t]
  )

  const handleResetPin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setForgotError("")
      if (resetNewPin !== resetConfirmPin) {
        setForgotError(t("pins_dont_match"))
        return
      }
      if (resetNewPin === tempPin) {
        setForgotError(t("pin_same_as_temp"))
        return
      }
      setForgotLoading(true)
      try {
        await authService.resetPinWithCode(formatPhoneE164(forgotPhone), tempPin, resetNewPin)
        setResetSuccess(true)
      } catch (err) {
        const code = err instanceof Error ? err.message : ""
        if (code === "PIN_SAME_AS_TEMP") setForgotError(t("pin_same_as_temp"))
        else if (code === "PIN_SAME_AS_CURRENT") setForgotError(t("pin_same_as_current"))
        else if (code === "PIN_RESET_INVALID_TEMP") setForgotError(t("wrong_pin"))
        else setForgotError("Erreur")
      } finally {
        setForgotLoading(false)
      }
    },
    [forgotPhone, tempPin, resetNewPin, resetConfirmPin, t]
  )

  const phoneInvalid = phone.length > 0 && !validatePhoneE164(phone)
  const forgotPhoneInvalid = forgotPhone.length > 0 && !validatePhoneE164(forgotPhone)

  const cooldownProgress = isCoolingDown ? 1 - cooldownRemaining / authService.cooldownSeconds : 0
  const circumference = 2 * Math.PI * 20

  const pinSlotBase =
    "h-10 w-10 rounded-xl border-2 border-input bg-card text-base font-bold shadow-sm sm:h-12 sm:w-12 sm:text-lg lg:h-11 lg:w-11"

  return (
    <div className="flex h-full min-h-dvh flex-col overflow-hidden px-4 pt-24 pb-2 sm:px-8 sm:pt-28 md:px-12 lg:min-h-0 lg:justify-start lg:bg-card lg:px-16 lg:pt-14 lg:pb-3">
      {/* Logo */}
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

      {/* Multi-step container */}
      <div className="relative mx-auto w-full max-w-md flex-1 min-h-0 overflow-x-hidden overflow-y-hidden">

        {/* ===== STEP 1: LOGIN ===== */}
        {step === "login" && (
          <form
            onSubmit={handleLogin}
            className={`flex h-full flex-col justify-start gap-3.5 py-0.5 ${animClass}`}
          >
            {showPinSmsBanner ? (
              <Alert className="border-primary/30 bg-primary/5 text-foreground">
                <CheckCircle2 className="text-primary" />
                <AlertTitle className="text-foreground leading-snug">{t("mgr_pin_sms_success")}</AlertTitle>
              </Alert>
            ) : null}
            {showPinChangedBanner ? (
              <Alert className="border-primary/30 bg-primary/5 text-foreground">
                <CheckCircle2 className="text-primary" />
                <AlertTitle className="text-foreground leading-snug">{t("login_pin_changed_success")}</AlertTitle>
              </Alert>
            ) : null}
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("login_title")}</h1>
            </div>

            {/* Erreur PIN uniquement (pas le verrouillage 3 échecs — celui-ci utilise le bandeau cooldown) */}
            {error === "INVALID_CREDENTIALS" && !isCoolingDown && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <ShieldAlert className="size-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">{t("wrong_pin")}</p>
                  <p className="mt-0.5 text-xs text-destructive/80">
                    {attemptsRemaining} {t("attempts_remaining")}
                  </p>
                </div>
              </div>
            )}

            {/* Cooldown banner */}
            {isCoolingDown && (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-6">
                <div className="relative flex items-center justify-center">
                  <svg className="size-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" className="stroke-accent/20" />
                    <circle
                      cx="24" cy="24" r="20" fill="none" strokeWidth="3" strokeLinecap="round"
                      className="stroke-primary transition-all duration-1000"
                      style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - cooldownProgress) }}
                    />
                  </svg>
                  <Clock className="absolute size-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{t("too_many_attempts")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("cooldown_message")} <span className="font-bold text-primary">{cooldownRemaining}</span> {t("cooldown_seconds")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              {/* Phone */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                  {t("phone_label")}<span className="text-destructive"> *</span>
                </Label>
                <PhoneInputField
                  id="phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder={t("phone_placeholder")}
                  searchPlaceholder={t("phone_country_search")}
                  disabled={isCoolingDown}
                  invalid={Boolean(phoneError) || phoneInvalid}
                  defaultCountry="cm"
                />
                {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
              </div>

              {/* PIN */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">
                  {t("pin_label")}<span className="text-destructive"> *</span>
                </Label>
                <div className={`flex justify-center ${shaking ? "animate-shake" : ""}`}>
                  <InputOTP maxLength={4} value={pin} onChange={setPin} disabled={isCoolingDown}>
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <InputOTPSlot
                          key={i} index={i}
                          className={`${pinSlotBase} ${
                            error && !isCoolingDown ? "border-destructive bg-destructive/5 text-destructive" : ""
                          }`}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            </div>

            {/* Forgot PIN link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => goToStep("forgot-phone")}
                className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                {t("forgot_pin_link")}
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit" disabled={loading || isCoolingDown || pin.length < 4 || !validatePhoneE164(phone)}
              className="h-12 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" />{t("login_loading")}</span>
              ) : (
                <span className="flex items-center gap-2"><Lock className="size-4" />{t("login_button")}</span>
              )}
            </Button>
          </form>
        )}

        {/* ===== STEP 2: CHANGE PIN (first login) ===== */}
        {step === "change-pin" && (
          <form
            onSubmit={handleChangePin}
            className={`flex flex-col justify-center gap-4 py-3 lg:gap-3 lg:py-2 ${animClass}`}
          >
            {/* Back button */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("back_to_login")}
            </button>

            <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary to-accent px-4 py-4 lg:py-3 text-primary-foreground">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm lg:size-9">
                <KeyRound className="size-6" />
              </div>
              <h2 className="mt-2 text-base font-bold sm:text-lg">{t("first_login_title")}</h2>
              <p className="mt-1 text-center text-sm leading-relaxed text-primary-foreground/80">
                {t("first_login_subtitle")}
              </p>
            </div>

            {pinError && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <ShieldAlert className="size-5 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">{pinError}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("current_pin")}</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={currentPin} onChange={setCurrentPin}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className={pinSlotBase} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("new_pin")}</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={newPin} onChange={setNewPin}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className={pinSlotBase} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("confirm_pin")}</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot
                        key={i} index={i}
                        className={`${pinSlotBase} ${
                          confirmPin.length === 4 && confirmPin !== newPin
                            ? "border-destructive bg-destructive/5 text-destructive"
                            : confirmPin.length === 4 && confirmPin === newPin
                              ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : ""
                        }`}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4}
              className="h-12 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{t("changing_pin")}</span>
              ) : (
                <span className="flex items-center gap-2"><ShieldCheck className="size-4" />{t("change_pin_button")}</span>
              )}
            </Button>
          </form>
        )}

        {/* ===== STEP 3: FORGOT PIN - Enter phone ===== */}
        {step === "forgot-phone" && (
          <form
            onSubmit={handleRequestSms}
            className={`flex flex-col justify-center gap-6 py-6 ${animClass}`}
          >
            {/* Back button */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("back_to_login")}
            </button>

            <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary to-accent px-5 py-5 text-primary-foreground">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
                <MessageSquare className="size-6" />
              </div>
              <h2 className="mt-3 text-lg font-bold sm:text-xl">{t("forgot_pin_title")}</h2>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-primary-foreground/80">
                {t("forgot_pin_subtitle")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-phone" className="text-sm font-medium text-foreground">
                {t("phone_label")}<span className="text-destructive"> *</span>
              </Label>
              <PhoneInputField
                id="forgot-phone"
                value={forgotPhone}
                onChange={setForgotPhone}
                placeholder={t("phone_placeholder")}
                searchPlaceholder={t("phone_country_search")}
                invalid={Boolean(forgotError && forgotPhoneInvalid) || forgotPhoneInvalid}
                defaultCountry="cm"
              />
            </div>

            <Button
              type="submit" disabled={forgotLoading || !validatePhoneE164(forgotPhone)}
              className="h-13 w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {forgotLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" />{t("sending_sms")}</span>
              ) : (
                <span className="flex items-center gap-2"><Send className="size-4" />{t("send_sms")}</span>
              )}
            </Button>
          </form>
        )}

        {/* ===== STEP 4: FORGOT PIN - Enter temp PIN + new PIN ===== */}
        {step === "forgot-reset" && (
          <div className={`flex flex-col justify-center gap-4 py-4 ${animClass}`}>
            {/* Back button */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("back_to_login")}
            </button>

            {/* Success state */}
            {resetSuccess ? (
              <div className="flex flex-col items-center gap-5">
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 px-5 py-5 text-white">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h2 className="mt-3 text-lg font-bold sm:text-xl">{t("pin_reset_success").split("!")[0]}!</h2>
                  <p className="mt-1.5 text-center text-sm leading-relaxed text-white/80">
                    {t("pin_reset_success").split("!")[1]?.trim()}
                  </p>
                </div>
                <Button
                  onClick={goBackToLogin}
                  className="h-12 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
                >
                  <span className="flex items-center gap-2"><Lock className="size-4" />{t("login_button")}</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPin} className="flex flex-col gap-4">
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary to-accent px-5 py-5 text-primary-foreground">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h2 className="mt-3 text-lg font-bold sm:text-xl">{t("sms_sent_title")}</h2>
                  <p className="mt-1.5 text-center text-sm leading-relaxed text-primary-foreground/80">
                    {t("sms_sent_subtitle")} <span className="font-bold">{formatPhoneE164(forgotPhone)}</span>
                  </p>
                </div>

                {forgotError && (
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5">
                    <ShieldAlert className="size-4 shrink-0 text-destructive" />
                    <p className="text-sm font-medium text-destructive">{forgotError}</p>
                  </div>
                )}

                {/* Temp PIN */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("temp_pin_label")}</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={4} value={tempPin} onChange={setTempPin}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3].map((i) => (
                          <InputOTPSlot key={i} index={i} className={pinSlotBase} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* New PIN */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("new_pin_reset")}</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={4} value={resetNewPin} onChange={setResetNewPin}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3].map((i) => (
                          <InputOTPSlot key={i} index={i} className={pinSlotBase} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {/* Confirm new PIN */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("confirm_pin_reset")}</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={4} value={resetConfirmPin} onChange={setResetConfirmPin}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3].map((i) => (
                          <InputOTPSlot
                            key={i} index={i}
                            className={`${pinSlotBase} ${
                              resetConfirmPin.length === 4 && resetConfirmPin !== resetNewPin
                                ? "border-destructive bg-destructive/5 text-destructive"
                                : resetConfirmPin.length === 4 && resetConfirmPin === resetNewPin
                                  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                  : ""
                            }`}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={forgotLoading || tempPin.length < 4 || resetNewPin.length < 4 || resetConfirmPin.length < 4}
                  className="h-12 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{t("resetting_pin")}</span>
                  ) : (
                    <span className="flex items-center gap-2"><ShieldCheck className="size-4" />{t("reset_pin_button")}</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Language */}
      <div className="mt-1 flex justify-center pt-1 lg:mt-2 lg:pt-2">
        <LanguageSwitcher />
      </div>
    </div>
  )
}
