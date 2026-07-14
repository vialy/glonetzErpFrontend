"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Clock3,
  Landmark,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { useManagerWallet } from "@/hooks/use-manager-wallet"
import { useManagerAccount } from "@/hooks/use-manager-account"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { DataLoadError } from "@/components/data-load-error"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { MobileBackButton } from "@/components/mobile-back-button"
import { useLocale } from "@/hooks/use-locale"
import { isApiDataProvider } from "@/lib/data-provider"
import { computePeriodRange, defaultManagerPeriodFilter, isIsoDateInPeriod, type ManagerPeriodFilterValue } from "@/lib/manager-period-range"
import { prepareManagerStatementEntries, type ManagerStatementRow } from "@/lib/manager-statement-display"
import { formatFcfa } from "@/lib/audit-date-range"
import type { StatementEntry, StatementSource } from "@/services/staff-accounts.service"
import { CardListSkeleton, KpiCardsLargeSkeleton } from "@/components/loading/data-skeletons"
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

/**
 * Vue "compte réel" (mode API) : solde via /staff/accounts/me et relevé
 * (entrées/sorties) via /staff/accounts/statement.
 */
function AccountStatementView() {
  const { t, locale } = useLocale()
  const { account, entries, loading, error, refresh } = useManagerAccount()
  const [period, setPeriod] = useState<ManagerPeriodFilterValue>(() => defaultManagerPeriodFilter())
  const [retrying, setRetrying] = useState(false)

  const range = useMemo(() => computePeriodRange(period), [period])

  const filteredEntries = useMemo(() => {
    const inPeriod = entries.filter((e) => isIsoDateInPeriod(e.createdAt, range))
    return prepareManagerStatementEntries(inPeriod, locale)
  }, [entries, range, locale])

  const totals = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    for (const e of filteredEntries) {
      if (e.excludeFromTotals) continue
      if (e.direction === "in") totalIn += e.totalAmount
      else totalOut += e.totalAmount
    }
    return { totalIn, totalOut }
  }, [filteredEntries])

  const sourceLabel = (source: StatementSource) => {
    switch (source) {
      case "payment":
        return t("mgr_acct_src_payment")
      case "transfer":
        return t("mgr_acct_src_transfer")
      case "withdrawal":
        return t("mgr_acct_src_withdrawal")
      case "expense":
        return t("mgr_acct_src_expense")
      default:
        return t("mgr_acct_src_adjustment")
    }
  }

  const countLabel = t("mgr_acct_count").replace("{n}", String(filteredEntries.length))

  if (error && !account && entries.length === 0) {
    return (
      <DataLoadError
        fullScreen
        onRetry={async () => {
          setRetrying(true)
          await refresh()
          setRetrying(false)
        }}
        retrying={retrying}
      />
    )
  }

  return (
    <div className="relative flex min-h-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-muted/40 to-transparent" />

      <div className="relative flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard" />

        <AdminPageHeader
          title={t("mgr_budget_title")}
          subtitle={t("mgr_acct_statement_sub")}
          gradientClassName="from-slate-800 to-slate-900"
        />

        <div className="mt-6">
          {loading ? (
            <KpiCardsLargeSkeleton />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <KpiCard
                label={t("mgr_acct_balance")}
                value={formatFcfa(account?.balance ?? 0)}
                hint={t("mgr_acct_balance_hint")}
                icon={<Wallet className="size-5" />}
              />
              <KpiCard
                label={t("mgr_acct_in")}
                value={formatFcfa(totals.totalIn)}
                icon={<TrendingUp className="size-5" />}
              />
              <KpiCard
                label={t("mgr_acct_out")}
                value={formatFcfa(totals.totalOut)}
                icon={<TrendingDown className="size-5" />}
              />
            </div>
          )}
        </div>

        <section className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/30 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                <Building2 className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">{t("mgr_acct_statement_title")}</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("mgr_acct_statement_sub")}</p>
              </div>
            </div>

            <div className="mt-6">
              <ManagerPeriodFilter
                value={period}
                onChange={setPeriod}
                hint={t("mgr_budget_filter_hint")}
                summary={countLabel}
              />
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <CardListSkeleton count={4} height="h-20" />
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
                <ArrowDownLeft className="mb-3 size-9 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("mgr_acct_empty")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredEntries.map((entry) => (
                  <li key={entry.id}>
                    <StatementRow
                      entry={entry}
                      locale={locale}
                      sourceLabel={sourceLabel(entry.source)}
                      dirLabel={entry.direction === "in" ? t("mgr_acct_dir_in") : t("mgr_acct_dir_out")}
                      balanceAfterLabel={t("mgr_acct_balance_after")}
                      failedLabel={t("mgr_acct_failed_withdrawal")}
                      feeLabel={t("mgr_acct_withdrawal_fee")}
                    />
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

function StatementRow({
  entry,
  locale,
  sourceLabel,
  dirLabel,
  balanceAfterLabel,
  failedLabel,
  feeLabel,
}: {
  entry: ManagerStatementRow
  locale: "fr" | "en"
  sourceLabel: string
  dirLabel: string
  balanceAfterLabel: string
  failedLabel: string
  feeLabel: string
}) {
  const isIn = entry.direction === "in"
  const isFailed = entry.statusBadge === "failed_withdrawal"
  return (
    <div className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/30 sm:p-5">
      <div
        className={cn(
          "flex flex-col gap-4 border-l-2 pl-4 sm:flex-row sm:items-start sm:justify-between",
          isFailed ? "border-l-amber-500/50" : isIn ? "border-l-emerald-500/40" : "border-l-red-500/40",
        )}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isFailed
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  : isIn
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-red-500/15 text-red-700",
              )}
            >
              {isIn ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
              {isFailed ? failedLabel : dirLabel}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {entry.statusBadge === "withdrawal_fee" ? feeLabel : sourceLabel}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{entry.id}</span>
          </div>
          {entry.displayDescription ? (
            <p className="text-sm leading-relaxed text-foreground/90">{entry.displayDescription}</p>
          ) : null}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 shrink-0" />
            {formatAllocDate(entry.createdAt, locale)}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p
            className={cn(
              "text-xl font-semibold tabular-nums tracking-tight",
              isFailed
                ? "text-muted-foreground line-through"
                : isIn
                  ? "text-emerald-700"
                  : "text-red-600 dark:text-red-400",
            )}
          >
            {isFailed ? "" : isIn ? "+" : "-"}
            {formatFcfa(entry.totalAmount)}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {balanceAfterLabel}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">{formatFcfa(entry.balanceAfter)}</p>
        </div>
      </div>
    </div>
  )
}

/** Vue historique (mode mock) : enveloppe budgétaire + versements de l'administration. */
function MockBudgetView() {
  const { t, locale } = useLocale()
  const { summary, allocations, loading } = useManagerWallet()
  const [period, setPeriod] = useState<ManagerPeriodFilterValue>(() => defaultManagerPeriodFilter())

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

        {loading ? (
          <KpiCardsLargeSkeleton className="mt-6" />
        ) : summary ? (
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
            {loading ? (
              <CardListSkeleton count={4} height="h-24" />
            ) : filteredAllocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
                <ArrowDownLeft className="mb-3 size-9 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("mgr_hist_empty_versements")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredAllocations.map((a, idx) => (
                  <li key={a.id}>
                    <div className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/30 sm:p-5">
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

export default function ManagerBudgetPage() {
  // En mode API : compte réel (solde + relevé). En mode mock : vue enveloppe historique.
  return isApiDataProvider() ? <AccountStatementView /> : <MockBudgetView />
}
