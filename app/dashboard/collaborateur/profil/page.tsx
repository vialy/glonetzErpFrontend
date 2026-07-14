"use client"

import { Mail, User } from "lucide-react"
import { MobileBackButton } from "@/components/mobile-back-button"
import { StaffPasswordChangeSection } from "@/components/staff/staff-password-change-section"
import { FormSectionSkeleton } from "@/components/loading/data-skeletons"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"

export default function CollaborateurProfilPage() {
  const { t } = useLocale()
  const { email, fullName, status } = useAuth()
  const ready = status !== "loading"

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard/collaborateur/apprenants" />
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("collab_profile_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("collab_profile_sub")}</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        {ready ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">{t("collab_profile_identity")}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="font-medium">{fullName ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <span>{email ?? "—"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("collab_profile_role_label")}</p>
            </div>
          </div>
        ) : (
          <FormSectionSkeleton />
        )}

        {ready ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <StaffPasswordChangeSection
              descriptionKey="collab_profile_password_desc"
              errorTitleKey="collab_profile_password_fail"
            />
          </div>
        ) : (
          <FormSectionSkeleton />
        )}
      </div>
    </div>
  )
}
