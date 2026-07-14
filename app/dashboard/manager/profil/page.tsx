"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Check, Mail, User } from "lucide-react"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { authService } from "@/domains/auth"
import { isApiDataProvider } from "@/lib/data-provider"
import { FormSectionSkeleton } from "@/components/loading/data-skeletons"
import { StaffPasswordChangeSection } from "@/components/staff/staff-password-change-section"
import { loadManagerProfile, saveManagerProfile } from "@/lib/manager-profile"

export default function ManagerProfilPage() {
  const { t } = useLocale()
  const { status, email: sessionEmail, fullName: sessionName, refreshSession } = useAuth()
  const isApi = isApiDataProvider()

  const [profileReady, setProfileReady] = useState(false)
  const [name, setName] = useState("")
  const [saveOk, setSaveOk] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (status === "loading") return

      if (isApi) {
        if (status === "authenticated") {
          try {
            await refreshSession()
          } catch {
            /* handled by auth provider */
          }
          const latest = authService.getSession()
          if (!cancelled && latest) {
            setName(latest.fullName ?? "")
          }
        }
        if (!cancelled) setProfileReady(true)
        return
      }

      const fallback = { name: sessionName ?? t("mgr_profile_demo_name"), phone: "" }
      const loaded = loadManagerProfile(fallback)
      if (!cancelled) {
        setName(loaded.name)
        setProfileReady(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isApi, refreshSession, sessionName, status, t])

  const handleSaveProfile = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (isApi) return
      const n = name.trim()
      if (!n) return
      setSaveOk(false)
      saveManagerProfile({ name: n, phone: "" })
      setSaveOk(true)
      window.setTimeout(() => setSaveOk(false), 4000)
    },
    [isApi, name],
  )

  const readOnly = isApi

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 md:px-6 md:pb-10">
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

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          {profileReady ? (
            <form
              onSubmit={handleSaveProfile}
              className="h-full rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
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
                      readOnly={readOnly}
                      disabled={readOnly}
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
                {readOnly ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{t("mgr_profile_readonly_hint")}</p>
                ) : (
                  <>
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
                    <Button type="submit" disabled={!name.trim()}>
                      {t("mgr_profile_save")}
                    </Button>
                  </>
                )}
              </div>
            </form>
          ) : (
            <FormSectionSkeleton />
          )}

          {profileReady ? (
            <div className="h-full rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <StaffPasswordChangeSection
                descriptionKey="mgr_profile_password_desc"
                errorTitleKey="mgr_profile_password_fail"
              />
            </div>
          ) : (
            <FormSectionSkeleton />
          )}
        </div>
      </div>
    </div>
  )
}
