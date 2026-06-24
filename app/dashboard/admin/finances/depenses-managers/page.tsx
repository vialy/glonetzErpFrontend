"use client"

import { useEffect, useMemo, useState } from "react"
import { PiggyBank, Receipt, TrendingDown, Wallet } from "lucide-react"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { formatFcfa } from "@/services/admin-mock.service"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"
import { isIsoDateInPeriod, computePeriodRange } from "@/lib/manager-period-range"
import type { ManagerExpenseRecord, ManagerPaymentMethod } from "@/domains/manager-wallet/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function methodLabel(m: ManagerPaymentMethod, t: (k: import("@/services/i18n").TranslationKey) => string) {
  if (m === "cash") return t("mgr_method_cash")
  if (m === "mtn_momo") return t("mgr_method_mtn")
  if (m === "orange_money") return t("mgr_method_om")
  return t("mgr_method_bank")
}

export default function AdminManagerExpensesPage() {
  const { t } = useLocale()
  const {
    managers,
    managerWalletSnapshots,
    getManagerExpenses,
    getManagerSummary,
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
        ? managers.flatMap((m) => getManagerExpenses(m.id).map((e) => ({ ...e, managerId: m.id })))
        : getManagerExpenses(managerFilter).map((e) => ({ ...e, managerId: managerFilter }))
    return source
      .filter((e) => (periodFilterApplied ? isIsoDateInPeriod(e.spentAt, periodRange) : true))
      .sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
  }, [managerFilter, managers, getManagerExpenses, periodFilterApplied, periodRange, tick])

  const managerName = (id: string) => managers.find((m) => m.id === id)?.fullName ?? id

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-violet-700 via-fuchsia-700 to-rose-700 px-4 py-4 text-white sm:px-5">
          <p className="text-base font-semibold">{t("fin_mgr_exp_title")}</p>
          <p className="mt-1 max-w-2xl text-sm text-white/85">{t("fin_mgr_exp_sub")}</p>
        </div>
        <div className="border-b bg-muted/20 p-4 sm:p-5">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_exp_filter_manager")}</span>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="h-10 w-full max-w-md rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="all">{t("fin_mgr_exp_all_managers")}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminKpiCard
          label={t("fin_mgr_exp_kpi_allocated")}
          value={formatFcfa(selectedSnapshot.allocated)}
          hint={t("fin_mgr_exp_kpi_allocated_hint")}
          icon={<Wallet className="size-4 text-violet-600" />}
        />
        <AdminKpiCard
          label={t("fin_mgr_exp_kpi_spent")}
          value={formatFcfa(selectedSnapshot.spent)}
          hint={t("fin_mgr_exp_kpi_spent_hint")}
          icon={<TrendingDown className="size-4 text-rose-600" />}
        />
        <AdminKpiCard
          label={t("fin_mgr_exp_kpi_remaining")}
          value={formatFcfa(selectedSnapshot.remaining)}
          hint={t("fin_mgr_exp_kpi_remaining_hint")}
          icon={<PiggyBank className="size-4 text-emerald-600" />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
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
                <TableHead>{t("fin_mgr_exp_th_method")}</TableHead>
                <TableHead>{t("fin_mgr_exp_th_comment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
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
                    method={methodLabel(e.paymentMethod, t)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {expenses.length === 0 ? (
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDay(e.spentAt)} · {methodLabel(e.paymentMethod, t)}
                </p>
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
  method,
}: {
  expense: ManagerExpenseRecord & { managerId: string }
  showManager: boolean
  managerName: string
  method: string
}) {
  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">{formatDay(expense.spentAt)}</TableCell>
      {showManager ? <TableCell>{managerName}</TableCell> : null}
      <TableCell className="font-medium">{expense.categoryLabel}</TableCell>
      <TableCell className="text-right tabular-nums font-semibold">{formatFcfa(expense.amount)}</TableCell>
      <TableCell className="text-sm">{method}</TableCell>
      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{expense.comment ?? "—"}</TableCell>
    </TableRow>
  )
}
