"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Check, Mail, Phone, User } from "lucide-react"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { loadManagerProfile, saveManagerProfile } from "@/lib/manager-profile"

export default function ManagerProfilPage() {
  const { t } = useLocale()
  const { email: sessionEmail, phone: sessionPhone } = useAuth()

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
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{sessionEmail ?? "—"}</span>
                </p>
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
      </div>
    </div>
  )
}
