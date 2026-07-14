"use client"

import { useEffect, useMemo, useState } from "react"
import { PiggyBank, Receipt, TrendingDown, Wallet } from "lucide-react"
import { FinanceFilterCard, FinanceStatCard } from "@/components/finances/finance-premium-ui"
import { formatFcfa } from "@/services/admin-mock.service"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"
import { isIsoDateInPeriod, computePeriodRange } from "@/lib/manager-period-range"
import type { ManagerExpenseRecord } from "@/domains/manager-wallet/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CardListSkeleton, FinanceStatCardsSkeleton, TableRowsSkeleton } from "@/components/loading/data-skeletons"

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function AdminManagerExpensesPage() {
  const { t } = useLocale()
  const {
    managers,
    managersLoading,
    managerWalletSnapshots,
    getManagerExpenses,
    getManagerSummary,
    allManagerExpenses,
    periodFilter,
    periodFilterApplied,
  } = useFinanceContext()
  const [managerFilter, setManagerFilter] = useState("all")
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1)
    window.addEventListener("manager-wallet-updated", refresh)
    return () => window.removeEventListener("manager-wallet-updated", refresh)
  }, [])

  const periodRange = useMemo(() => computePeriodRange(periodFilter), [periodFilter])

  const selectedSnapshot = useMemo(() => {
    void tick
    if (managerFilter === "all") {
      const allocated = managerWalletSnapshots.reduce((s, x) => s + x.allocated, 0)
      const spent = managerWalletSnapshots.reduce((s, x) => s + x.spent, 0)
      return { allocated, spent, remaining: Math.max(allocated - spent, 0) }
    }
    const snap = managerWalletSnapshots.find((s) => s.managerId === managerFilter)
    if (snap) return { allocated: snap.allocated, spent: snap.spent, remaining: snap.remaining }
    const summary = getManagerSummary(managerFilter)
    return { allocated: summary.envelopeCeiling, spent: summary.totalSpent, remaining: summary.remaining }
  }, [managerFilter, managerWalletSnapshots, getManagerSummary, tick])

  const expenses = useMemo(() => {
    void tick
    const source =
      managerFilter === "all"
        ? allManagerExpenses.map((e) => ({
            ...e,
            managerId: e.managerId ?? "unknown",
          }))
        : getManagerExpenses(managerFilter).map((e) => ({ ...e, managerId: managerFilter }))
    return source
      .filter((e) => (periodFilterApplied ? isIsoDateInPeriod(e.spentAt, periodRange) : true))
      .sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
  }, [
    managerFilter,
    allManagerExpenses,
    getManagerExpenses,
    periodFilterApplied,
    periodRange,
    tick,
  ])

  const managerName = (id: string) => managers.find((m) => m.id === id)?.fullName ?? id

  return (
    <div className="space-y-4">
      <FinanceFilterCard accent="fuchsia">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("fin_mgr_exp_filter_manager")}
          </span>
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            disabled={managersLoading}
            className="h-11 w-full max-w-md rounded-xl border border-input bg-background/80 px-3 text-sm shadow-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="all">{t("fin_mgr_exp_all_managers")}</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          {!managersLoading && managers.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("fin_mgr_exp_no_managers")}</p>
          ) : null}
        </label>
      </FinanceFilterCard>

      {managersLoading ? (
        <FinanceStatCardsSkeleton count={3} />
      ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FinanceStatCard
          featured
          accent="violet"
          label={t("fin_mgr_exp_kpi_allocated")}
          value={formatFcfa(selectedSnapshot.allocated)}
          hint={t("fin_mgr_exp_kpi_allocated_hint")}
          icon={<Wallet className="size-4" />}
        />
        <FinanceStatCard
          featured
          accent="fuchsia"
          label={t("fin_mgr_exp_kpi_spent")}
          value={formatFcfa(selectedSnapshot.spent)}
          hint={t("fin_mgr_exp_kpi_spent_hint")}
          icon={<TrendingDown className="size-4" />}
          progress={
            selectedSnapshot.allocated > 0
              ? Math.round((selectedSnapshot.spent / selectedSnapshot.allocated) * 100)
              : 0
          }
        />
        <FinanceStatCard
          featured
          accent="sky"
          label={t("fin_mgr_exp_kpi_remaining")}
          value={formatFcfa(selectedSnapshot.remaining)}
          hint={t("fin_mgr_exp_kpi_remaining_hint")}
          icon={<PiggyBank className="size-4" />}
          valueClassName="text-emerald-700 dark:text-emerald-400"
          progress={
            selectedSnapshot.allocated > 0
              ? Math.round((selectedSnapshot.remaining / selectedSnapshot.allocated) * 100)
              : 100
          }
        />
      </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_20px_40px_-28px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-card to-card px-4 py-3.5">
          <Receipt className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{t("fin_mgr_exp_history")}</p>
            <p className="text-xs text-muted-foreground">
              {expenses.length} {expenses.length === 1 ? t("fin_mgr_exp_line_one") : t("fin_mgr_exp_lines")}
              {periodFilterApplied ? ` · ${t("fin_mgr_exp_period_active")}` : ""}
            </p>
          </div>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fin_mgr_exp_th_date")}</TableHead>
                {managerFilter === "all" ? <TableHead>{t("fin_mgr_exp_th_manager")}</TableHead> : null}
                <TableHead>{t("fin_mgr_exp_th_category")}</TableHead>
                <TableHead className="text-right">{t("fin_mgr_exp_th_amount")}</TableHead>
                <TableHead>{t("acc_claim_proof")}</TableHead>
                <TableHead>{t("fin_mgr_exp_th_comment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managersLoading ? (
                <TableRowsSkeleton rows={5} cols={managerFilter === "all" ? 6 : 5} />
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={managerFilter === "all" ? 6 : 5} className="h-24 text-center text-muted-foreground">
                    {t("fin_mgr_exp_empty")}
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    showManager={managerFilter === "all"}
                    managerName={managerName(e.managerId)}
                    proofLabel={t("acc_claim_proof")}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {managersLoading ? (
            <CardListSkeleton count={3} height="h-28" />
          ) : expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("fin_mgr_exp_empty")}</p>
          ) : (
            expenses.map((e) => (
              <div key={e.id} className="rounded-xl border bg-muted/15 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.categoryLabel}</p>
                    {managerFilter === "all" ? (
                      <p className="text-xs text-muted-foreground">{managerName(e.managerId)}</p>
                    ) : null}
                  </div>
                  <p className="font-semibold tabular-nums">{formatFcfa(e.amount)}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{formatDay(e.spentAt)}</p>
                {e.attachmentDataUrl ? (
                  <a
                    href={e.attachmentDataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-primary underline underline-offset-2"
                  >
                    {e.attachmentName ?? t("acc_claim_proof")}
                  </a>
                ) : null}
                {e.comment ? <p className="mt-1 text-xs">{e.comment}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ExpenseRow({
  expense,
  showManager,
  managerName,
  proofLabel,
}: {
  expense: ManagerExpenseRecord & { managerId: string }
  showManager: boolean
  managerName: string
  proofLabel: string
}) {
  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">{formatDay(expense.spentAt)}</TableCell>
      {showManager ? <TableCell>{managerName}</TableCell> : null}
      <TableCell className="font-medium">{expense.categoryLabel}</TableCell>
      <TableCell className="text-right tabular-nums font-semibold">{formatFcfa(expense.amount)}</TableCell>
      <TableCell className="text-sm">
        {expense.attachmentDataUrl ? (
          <a
            href={expense.attachmentDataUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {expense.attachmentName ?? proofLabel}
          </a>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{expense.comment ?? "—"}</TableCell>
    </TableRow>
  )
}
