"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, Loader2, MessageSquare, Phone, User } from "lucide-react"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/hooks/use-locale"
import { authService } from "@/domains/auth"
import { useAuth } from "@/hooks/use-auth"
import { loadManagerProfile, saveManagerProfile } from "@/lib/manager-profile"

export default function ManagerProfilPage() {
  const { t } = useLocale()
  const router = useRouter()
  const { role, phone: sessionPhone } = useAuth()
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsError, setSmsError] = useState(false)

  const [profileReady, setProfileReady] = useState(false)
  const [name, setName] = useState("")
  const [phoneDisplay, setPhoneDisplay] = useState("")
  const [saveOk, setSaveOk] = useState(false)

  useEffect(() => {
    const fallback = {
      name: t("mgr_profile_demo_name"),
      phone: sessionPhone ?? "+237600000002",
    }
    const loaded = loadManagerProfile(fallback)
    setName(loaded.name)
    setPhoneDisplay(loaded.phone)
    setProfileReady(true)
  }, [sessionPhone, t])

  const handleSaveProfile = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const n = name.trim()
      const p = phoneDisplay.trim()
      if (!n || !p) return
      setSaveOk(false)
      saveManagerProfile({ name: n, phone: p })
      setSaveOk(true)
      window.setTimeout(() => setSaveOk(false), 4000)
    },
    [name, phoneDisplay],
  )

  const handleRequestPinSms = useCallback(async () => {
    if (!sessionPhone || role !== "manager") return
    setSmsError(false)
    setSmsLoading(true)
    try {
      await authService.requestManagerPinSms(sessionPhone)
      authService.clearSession({ clearMockPinOverrides: false })
      router.replace("/login?pinSms=1")
    } catch {
      setSmsError(true)
    } finally {
      setSmsLoading(false)
    }
  }, [sessionPhone, role, router])

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("mgr_profile_title")}</h1>
      </header>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="size-7" />
          </div>
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-primary">{t("mgr_profile_role")}</p>
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">{t("mgr_profile_text")}</p>
        </div>

        {profileReady ? (
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
          >
            <h2 className="mb-4 text-base font-semibold">{t("mgr_profile_section_identity")}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mgr-name">{t("mgr_profile_field_name")}</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mgr-name"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mgr-phone">{t("mgr_profile_field_phone")}</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mgr-phone"
                    className="pl-10 font-mono"
                    value={phoneDisplay}
                    onChange={(e) => setPhoneDisplay(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+237 6 …"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground/90">{t("mgr_profile_login_id")}</p>
                <p className="mt-0.5 font-mono text-sm text-foreground">{sessionPhone ?? "—"}</p>
                <p className="mt-1.5">{t("mgr_profile_login_id_hint")}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("mgr_profile_center_readonly")}
                </p>
                <p className="text-sm font-medium text-foreground">{t("mgr_profile_demo_center")}</p>
              </div>
              {saveOk ? (
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Check className="size-4" />
                  {t("mgr_profile_saved")}
                </div>
              ) : null}
              <Button type="submit" disabled={!name.trim() || !phoneDisplay.trim()}>
                {t("mgr_profile_save")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="h-48 animate-pulse rounded-2xl border border-border/60 bg-muted/20" aria-hidden />
        )}

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-foreground">
            <MessageSquare className="size-5 text-primary" />
            <h2 className="text-base font-semibold">{t("mgr_pin_sms_title")}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("mgr_pin_sms_desc")}</p>

          {smsError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>{t("mgr_pin_sms_error")}</AlertTitle>
            </Alert>
          ) : null}

          <Button
            type="button"
            className="mt-4 w-full sm:w-auto"
            disabled={smsLoading || role !== "manager" || !sessionPhone}
            onClick={handleRequestPinSms}
          >
            {smsLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("mgr_pin_sms_sending")}
              </>
            ) : (
              <>
                <MessageSquare className="size-4" />
                {t("mgr_pin_sms_button")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
