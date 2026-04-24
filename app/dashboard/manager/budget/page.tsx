"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDownLeft, Building2, Clock3, Landmark, PiggyBank, TrendingDown, Wallet } from "lucide-react"
import { ManagerWalletService } from "@/domains/manager-wallet"
import type { ManagerBudgetAllocation, ManagerBudgetSummary } from "@/domains/manager-wallet/types"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { MobileBackButton } from "@/components/mobile-back-button"
import { useLocale } from "@/hooks/use-locale"
import { computePeriodRange, defaultManagerPeriodFilter, isIsoDateInPeriod, type ManagerPeriodFilterValue } from "@/lib/manager-period-range"
import { formatFcfa } from "@/lib/audit-date-range"
import { cn } from "@/lib/utils"

function formatAllocDate(iso: string, locale: "fr" | "en") {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  footer,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-[1.6rem]">{value}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">{icon}</span>
      </div>
      {hint ? <p className="mt-3 text-xs text-muted-foreground">{hint}</p> : null}
      {footer}
    </div>
  )
}

export default function ManagerBudgetPage() {
  const { t, locale } = useLocale()
  const [summary, setSummary] = useState<ManagerBudgetSummary | null>(null)
  const [allocations, setAllocations] = useState<ManagerBudgetAllocation[]>([])
  const [period, setPeriod] = useState<ManagerPeriodFilterValue>(() => defaultManagerPeriodFilter())

  useEffect(() => {
    const refresh = () => {
      setSummary(ManagerWalletService.getSummary())
      setAllocations(ManagerWalletService.getAllocations())
    }
    refresh()
    window.addEventListener("manager-wallet-updated", refresh)
    return () => window.removeEventListener("manager-wallet-updated", refresh)
  }, [])

  const range = useMemo(() => computePeriodRange(period), [period])

  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => isIsoDateInPeriod(a.allocatedAt, range))
  }, [allocations, range])

  const totalCredits = useMemo(
    () => filteredAllocations.reduce((s, a) => s + a.amount, 0),
    [filteredAllocations],
  )

  const spentPct =
    summary && summary.envelopeCeiling > 0
      ? Math.min(100, Math.round((summary.totalSpent / summary.envelopeCeiling) * 100))
      : 0

  const transfersCountLabel = t("mgr_budget_transfers_count").replace("{n}", String(filteredAllocations.length))

  return (
    <div className="relative flex min-h-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-muted/40 to-transparent" />

      <div className="relative flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard" />

        <AdminPageHeader
          title={t("mgr_budget_title")}
          subtitle={t("mgr_budget_subtitle")}
          gradientClassName="from-slate-800 to-slate-900"
        />

        {summary ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <KpiCard
              label={t("mgr_budget_ceiling")}
              value={formatFcfa(summary.envelopeCeiling)}
              hint={summary.periodHint ?? undefined}
              icon={<Landmark className="size-5" />}
            />
            <KpiCard
              label={t("mgr_budget_spent")}
              value={formatFcfa(summary.totalSpent)}
              icon={<TrendingDown className="size-5" />}
              footer={
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/25 transition-all duration-500 dark:bg-foreground/35"
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {spentPct}% {t("mgr_budget_spent_pct")}
                  </p>
                </div>
              }
            />
            <KpiCard
              label={t("mgr_budget_remaining")}
              value={formatFcfa(summary.remaining)}
              icon={<PiggyBank className="size-5" />}
              footer={
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="size-3.5 shrink-0 opacity-70" />
                  {t("mgr_budget_remaining_hint")}
                </p>
              }
            />
          </div>
        ) : null}

        <section className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/30 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">{t("mgr_budget_transfers_title")}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("mgr_budget_transfers_sub")}</p>
                </div>
              </div>
              <div className="text-right sm:min-w-[140px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("mgr_budget_transfers_total_label")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatFcfa(totalCredits)}</p>
              </div>
            </div>

            <div className="mt-6">
              <ManagerPeriodFilter
                value={period}
                onChange={setPeriod}
                hint={t("mgr_budget_filter_hint")}
                summary={transfersCountLabel}
              />
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {filteredAllocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
                <ArrowDownLeft className="mb-3 size-9 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("mgr_hist_empty_versements")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredAllocations.map((a, idx) => (
                  <li key={a.id}>
                    <div
                      className={cn(
                        "rounded-xl border border-border bg-background p-4 transition-colors sm:p-5",
                        "hover:bg-muted/30",
                      )}
                    >
                      <div className="flex flex-col gap-4 border-l-2 border-l-foreground/15 pl-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{a.id}</span>
                            {idx === 0 ? (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {t("mgr_budget_transfer_latest")}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90">{a.note}</p>
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="size-3.5 shrink-0" />
                            {formatAllocDate(a.allocatedAt, locale)}
                          </p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("mgr_budget_transfer_amount")}
                          </p>
                          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                            +{formatFcfa(a.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="relative mt-8 rounded-xl border border-border bg-muted/25 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          {t("mgr_ask_admin")}
        </p>
      </div>
    </div>
  )
}
