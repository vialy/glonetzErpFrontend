"use client"

import { useCallback, useMemo, useState } from "react"
import { Wallet } from "lucide-react"
import { useManagerWallet } from "@/hooks/use-manager-wallet"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import {
  ALL_EXPENSE_CATEGORIES,
  ManagerExpenseCategoryFilter,
} from "@/components/manager/manager-expense-category-filter"
import { DataLoadError } from "@/components/data-load-error"
import { MobileBackButton } from "@/components/mobile-back-button"
import { ExpenseCardListSkeleton } from "@/components/loading/data-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/hooks/use-locale"
import { computePeriodRange, defaultManagerPeriodFilter, isIsoDateInPeriod, type ManagerPeriodFilterValue } from "@/lib/manager-period-range"
import { formatFcfa } from "@/lib/audit-date-range"

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function ManagerDepensesListePage() {
  const { t } = useLocale()
  const { expenses, loading, error, refresh } = useManagerWallet()
  const [retrying, setRetrying] = useState(false)
  const [period, setPeriod] = useState<ManagerPeriodFilterValue>(() => defaultManagerPeriodFilter())
  const [categoryId, setCategoryId] = useState<string>(ALL_EXPENSE_CATEGORIES)

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await refresh()
    setRetrying(false)
  }, [refresh])

  if (error && expenses.length === 0) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  const range = useMemo(() => computePeriodRange(period), [period])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!isIsoDateInPeriod(e.spentAt, range)) return false
      if (categoryId !== ALL_EXPENSE_CATEGORIES && e.categoryId !== categoryId) return false
      return true
    })
  }, [expenses, range, categoryId])

  const totalDepenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses])

  const expensesCountLabel = t("mgr_list_expenses_count").replace("{n}", String(filteredExpenses.length))

  return (
    <div className="mx-auto w-full max-w-none px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-6 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("mgr_list_title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("mgr_list_subtitle")}</p>
      </header>

      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          <ManagerPeriodFilter
            value={period}
            onChange={setPeriod}
            hint={t("mgr_list_filter_hint")}
            summary={expensesCountLabel}
            className="h-full"
          />
          <ManagerExpenseCategoryFilter value={categoryId} onChange={setCategoryId} className="h-full" />
        </div>
        {loading ? (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
            <Skeleton className="h-5 w-48" />
          </div>
        ) : filteredExpenses.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <span className="font-medium text-foreground">{t("mgr_hist_section_depenses")}:</span>{" "}
            <span className="tabular-nums font-semibold text-foreground">{formatFcfa(totalDepenses)}</span>
          </div>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
              <Wallet className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{t("mgr_hist_section_depenses")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("mgr_hist_section_depenses_sub")}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <ExpenseCardListSkeleton count={4} />
          ) : filteredExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-14 text-center text-sm text-muted-foreground">
              {t("mgr_empty_expenses")}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredExpenses.map((e) => (
                <li key={e.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{e.categoryLabel}</p>
                      <p className="font-mono text-xs text-muted-foreground">{e.id}</p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{formatFcfa(e.amount)}</p>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>
                      <dt className="inline">{t("acc_table_date")}: </dt>
                      <dd className="inline text-foreground">{formatDay(e.spentAt)}</dd>
                    </div>
                    {e.comment ? <div className="pt-1 text-foreground/90">{e.comment}</div> : null}
                    {e.attachmentDataUrl ? (
                      <a
                        href={e.attachmentDataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block pt-1 text-primary underline underline-offset-2"
                      >
                        {e.attachmentName ?? t("acc_claim_proof")}
                      </a>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
