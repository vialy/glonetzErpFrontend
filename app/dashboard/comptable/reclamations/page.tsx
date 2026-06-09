"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye } from "lucide-react"
import { ClaimProofActions } from "@/components/claims/claim-proof-actions"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { useLocale } from "@/hooks/use-locale"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Badge } from "@/components/ui/badge"
import { formatFcfa } from "@/lib/audit-date-range"

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadge(status: ClaimRecord["status"], t: (k: import("@/services/i18n").TranslationKey) => string) {
  if (status === "en_attente") return <Badge variant="secondary">{t("acc_claim_st_pending")}</Badge>
  if (status === "en_cours") return <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-400">{t("acc_claim_st_progress")}</Badge>
  if (status === "resolue") return <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-400">{t("acc_claim_st_resolved")}</Badge>
  return <Badge className="bg-destructive/10 text-destructive">{t("acc_claim_st_rejected")}</Badge>
}

export default function ComptableReclamationsPage() {
  const { t } = useLocale()
  const [claims, setClaims] = useState<ClaimRecord[]>([])

  useEffect(() => {
    const refresh = async () => setClaims(await claimsService.getAll())
    void refresh()
    window.addEventListener("claims-updated", refresh)
    return () => window.removeEventListener("claims-updated", refresh)
  }, [])

  const sorted = useMemo(() => [...claims].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [claims])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Eye className="size-3.5" />
            {t("acc_readonly_badge")}
          </div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("acc_claims_title")}</h1>
          <p className="max-w-lg text-sm text-muted-foreground leading-relaxed">{t("acc_claims_subtitle")}</p>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-14 text-center text-sm text-muted-foreground">
          {t("acc_empty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {sorted.map((claim) => (
            <li key={claim.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-muted-foreground">{claim.id}</p>
                {statusBadge(claim.status, t)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(claim.createdAt)}</p>
              <p className="mt-3 text-base font-semibold tabular-nums">{formatFcfa(claim.amount)}</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="text-muted-foreground shrink-0">{t("acc_table_method")}</dt>
                  <dd className="font-medium">
                    {claim.paymentMethod === "orange_money" ? t("acc_method_om") : t("acc_method_mtn")}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="text-muted-foreground shrink-0">{t("acc_claim_phone")}</dt>
                  <dd className="font-mono text-sm">{claim.phoneNumber}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="text-muted-foreground shrink-0">{t("acc_table_ref")}</dt>
                  <dd className="font-mono text-sm">{claim.transactionReference}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{claim.description}</p>
              {claim.screenshotDataUrl ? (
                <ClaimProofActions
                  className="mt-3"
                  claimId={claim.id}
                  screenshotDataUrl={claim.screenshotDataUrl}
                  screenshotName={claim.screenshotName}
                  viewLabel={t("recl_view_cap")}
                  downloadLabel={t("acc_claim_download")}
                  previewTitle={t("recl_proof_preview_title")}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
