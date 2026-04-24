"use client"

import { Shield } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { MobileBackButton } from "@/components/mobile-back-button"

export default function ComptableProfilPage() {
  const { t } = useLocale()

  return (
    <div className="mx-auto w-full max-w-md px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("acc_profile_title")}</h1>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="size-7" />
        </div>
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-primary">{t("acc_profile_role")}</p>
        <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">{t("acc_profile_text")}</p>
      </div>
    </div>
  )
}
