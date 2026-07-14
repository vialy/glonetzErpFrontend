"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Search, Wallet } from "lucide-react"
import { ExtraordinaryExpenseCreateForm } from "@/components/finances/extraordinary-expense-create-form"
import { FinanceFilterCard, FinancePremiumPanel } from "@/components/finances/finance-premium-ui"
import { adminExpenses, formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { isApiDataProvider } from "@/lib/data-provider"
import { useAdminExtraordinaryWallet } from "@/hooks/use-admin-extraordinary-wallet"
import {
  EXPENSES_UPDATED_EVENT,
  fetchExtraordinaryExpenses,
} from "@/services/staff-expenses.service"
import type { CreateManagerExpenseInput, ManagerBudgetSummary } from "@/domains/manager-wallet/types"

type ExtraRow = {
  id: string
  createdAt: string
  label: string
  amount: number
  walletId: string
  walletName: string
  source: "session" | "seed" | "api"
}

const COMPANY_WALLET_ID = "company-main"

export default function DepensesExtraordinairesPage() {
  const { t } = useLocale()
  const { session } = useAuth()
  const apiMode = isApiDataProvider()
  const categoriesOwnerId = session?.staffUserId ?? session?.email ?? "admin"
  const { operations, wallets, addExtraExpense, extraordinaryExpenses } = useFinanceContext()
  const extraordinaryWallet = useAdminExtraordinaryWallet()

  const [extraWalletId, setExtraWalletId] = useState(wallets[0]?.id ?? "")
  const [apiRows, setApiRows] = useState<ExtraRow[]>([])
  const [loadingApi, setLoadingApi] = useState(apiMode)

  const extraWallet = wallets.find((wallet) => wallet.id === extraWalletId)
  const [walletFilter, setWalletFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const reloadApiData = useCallback(async () => {
    if (!apiMode) return
    setLoadingApi(true)
    try {
      const expenses = await fetchExtraordinaryExpenses({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        accountId: walletFilter !== "all" ? walletFilter : undefined,
      })
      setApiRows(
        expenses.map((e) => ({
          id: e.id,
          createdAt: e.spentAt.slice(0, 10),
          label: e.categoryLabel || e.comment || t("fin_alloc_extra_title"),
          amount: e.amount,
          walletId: e.accountId ?? COMPANY_WALLET_ID,
          walletName: e.accountName ?? t("fin_wallets_type_company"),
          source: "api" as const,
        })),
      )
    } catch {
      setApiRows([])
    } finally {
      setLoadingApi(false)
    }
  }, [apiMode, dateFrom, dateTo, walletFilter, t])

  useEffect(() => {
    if (!apiMode) return
    void reloadApiData()
  }, [apiMode, reloadApiData, extraordinaryExpenses, extraordinaryWallet.allExpenses])

  useEffect(() => {
    if (!apiMode) return
    const refresh = () => void reloadApiData()
    window.addEventListener(EXPENSES_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(EXPENSES_UPDATED_EVENT, refresh)
  }, [apiMode, reloadApiData])

  const mockExtraOps = useMemo(
    () => operations.filter((op) => op.type === "extra_expense"),
    [operations],
  )

  const mockSummary = useMemo((): ManagerBudgetSummary | null => {
    if (apiMode || !extraWallet) return null
    const spentOnWallet = mockExtraOps
      .filter((op) => op.walletId === extraWalletId)
      .reduce((sum, op) => sum + op.amount, 0)
    const remaining = extraWallet.currentBalance
    return {
      envelopeCeiling: remaining + spentOnWallet,
      totalSpent: spentOnWallet,
      remaining,
      currencyCode: "XAF",
    }
  }, [apiMode, extraWallet, extraWalletId, mockExtraOps])

  const formSummary = apiMode ? extraordinaryWallet.summary : mockSummary
  const formLoading = apiMode ? extraordinaryWallet.loading : false
  const formAccountName = apiMode
    ? extraordinaryWallet.selectedAccount?.name
    : extraWallet?.name

  const allRows = useMemo<ExtraRow[]>(() => {
    if (apiMode) return apiRows
    const fromOps: ExtraRow[] = mockExtraOps.map((op) => ({
      id: op.id,
      createdAt: op.createdAt.slice(0, 10),
      label: op.label,
      amount: op.amount,
      walletId: op.walletId,
      walletName: wallets.find((w) => w.id === op.walletId)?.name ?? op.walletId,
      source: "session",
    }))
    const fromSeed: ExtraRow[] = adminExpenses
      .filter((e) => e.type === "extra")
      .map((e) => ({
        id: `seed-${e.id}`,
        createdAt: e.createdAt.slice(0, 10),
        label: e.label,
        amount: e.amount,
        walletId: "w-tuition",
        walletName: wallets.find((w) => w.id === "w-tuition")?.name ?? "w-tuition",
        source: "seed",
      }))
    return [...fromSeed, ...fromOps].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }, [apiMode, apiRows, mockExtraOps, wallets])

  const walletOptions = useMemo(() => {
    if (apiMode) {
      return extraordinaryWallet.treasuryWallets.map((w) => ({
        id: w.accountId,
        name: w.name,
        balance: w.balance,
      }))
    }
    return wallets.map((w) => ({ id: w.id, name: w.name, balance: w.currentBalance }))
  }, [apiMode, extraordinaryWallet.treasuryWallets, wallets])

  const filtered = useMemo(() => {
    return allRows.filter((row) => {
      if (walletFilter !== "all" && row.walletId !== walletFilter) return false
      if (dateFrom && row.createdAt < dateFrom) return false
      if (dateTo && row.createdAt > dateTo) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!row.label.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allRows, walletFilter, dateFrom, dateTo, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [walletFilter, dateFrom, dateTo, query])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function walletName(id: string, row?: ExtraRow) {
    if (row?.walletName) return row.walletName
    if (apiMode) {
      return (
        extraordinaryWallet.treasuryWallets.find((w) => w.accountId === id)?.name ??
        t("fin_wallets_type_company")
      )
    }
    return wallets.find((w) => w.id === id)?.name ?? id
  }

  function exportCsv() {
    if (filtered.length === 0) {
      toast({ title: t("fin_extra_toast_no_rows"), description: t("fin_extra_toast_no_export") })
      return
    }
    const header = "date,motif,montant,portefeuille,operation_id,source"
    const rows = filtered.map((r) =>
      [r.createdAt, r.label, String(r.amount), walletName(r.walletId, r), r.id, r.source]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `depenses-extraordinaires-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: t("fin_extra_toast_export_title"),
      description: t("fin_extra_toast_export_desc").replace("{n}", String(filtered.length)),
    })
  }

  async function handleCreateExpense(input: CreateManagerExpenseInput) {
    if (apiMode) {
      await extraordinaryWallet.createExpense(input)
      await reloadApiData()
      return
    }

    const label = input.comment?.trim()
      ? `${input.categoryLabel} — ${input.comment.trim()}`
      : input.categoryLabel
    const result = addExtraExpense(extraWalletId, label, input.amount)
    if (!result.ok) {
      throw new Error(result.reason ?? "UNKNOWN")
    }
  }

  const walletField = apiMode ? (
    <label className="mb-4 block text-xs font-medium text-muted-foreground">
      {t("fin_alloc_wallet_src")}
      <select
        value={extraordinaryWallet.selectedAccountId}
        onChange={(e) => extraordinaryWallet.setSelectedAccountId(e.target.value)}
        disabled={formLoading || extraordinaryWallet.treasuryWallets.length === 0}
        className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
      >
        {extraordinaryWallet.treasuryWallets.map((wallet) => (
          <option key={wallet.accountId} value={wallet.accountId}>
            {wallet.name} ({formatFcfa(wallet.balance)})
          </option>
        ))}
      </select>
    </label>
  ) : (
    <label className="mb-4 block text-xs font-medium text-muted-foreground">
      {t("fin_alloc_wallet_src")}
      <select
        value={extraWalletId}
        onChange={(e) => setExtraWalletId(e.target.value)}
        className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
      >
        {wallets.map((wallet) => (
          <option key={wallet.id} value={wallet.id}>
            {wallet.name} ({formatFcfa(wallet.currentBalance)})
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-4 py-2.5 text-xs font-bold shadow-sm transition hover:shadow-md"
        >
          <Download className="size-3.5 text-amber-700 dark:text-amber-300" />
          {t("fin_extra_export")}
        </button>
      </div>

      <FinancePremiumPanel
        title={t("fin_alloc_extra_title")}
        description={t("fin_alloc_extra_sub")}
        accent="amber"
      >
        <ExtraordinaryExpenseCreateForm
          summary={formSummary}
          loading={formLoading}
          accountName={formAccountName}
          categoriesOwnerId={categoriesOwnerId}
          onSubmit={handleCreateExpense}
          walletField={walletField}
        />
      </FinancePremiumPanel>

      <FinanceFilterCard accent="amber">
        <p className="text-sm font-bold">{t("fin_extra_filters")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_extra_wallet")}</span>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">{t("fin_extra_all_wallets")}</option>
              {walletOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_extra_from")}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_extra_to")}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_extra_search")}</span>
            <span className="relative flex">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("fin_extra_search_ph")}
                className="min-h-10 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm shadow-sm"
              />
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {t("fin_extra_pagination_info")
              .replace("{page}", String(page))
              .replace("{total}", String(pageCount))
              .replace("{size}", String(pageSize))}
          </p>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-xl border bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm"
          >
            <option value={10}>{t("fin_extra_per_page").replace("{n}", "10")}</option>
            <option value={20}>{t("fin_extra_per_page").replace("{n}", "20")}</option>
            <option value={50}>{t("fin_extra_per_page").replace("{n}", "50")}</option>
          </select>
        </div>
      </FinanceFilterCard>

      <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_20px_40px_-28px_rgba(15,23,42,0.35)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-[1] border-b bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("fin_extra_th_date")}</th>
                <th className="px-4 py-3">{t("fin_extra_th_reason")}</th>
                <th className="px-4 py-3">{t("fin_extra_th_wallet")}</th>
                <th className="px-4 py-3 text-right">{t("fin_extra_th_amount")}</th>
                <th className="px-4 py-3">{t("fin_extra_th_ref")}</th>
              </tr>
            </thead>
            <tbody>
              {loadingApi && apiMode ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={5}>
                    …
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.createdAt}</td>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Wallet className="size-3.5 shrink-0" />
                        {walletName(row.walletId, row)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-800 dark:text-amber-400">
                      − {formatFcfa(row.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.id}
                      {row.source === "seed" ? (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{t("fin_extra_demo")}</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
              {!loadingApi && paged.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={5}>
                    {t("fin_extra_empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loadingApi && apiMode ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            …
          </div>
        ) : paged.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            {t("fin_extra_empty")}
          </div>
        ) : (
          paged.map((row) => (
            <div key={row.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.createdAt}</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-amber-800 dark:text-amber-400">− {formatFcfa(row.amount)}</p>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5" />
                {walletName(row.walletId, row)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.id}</p>
            </div>
          ))
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t("fin_extra_pagination")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-9 flex-1 rounded-xl border bg-background px-3 text-xs font-semibold disabled:opacity-50 sm:flex-none"
            >
              {t("fin_extra_prev")}
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="min-h-9 flex-1 rounded-xl border bg-background px-3 text-xs font-semibold disabled:opacity-50 sm:flex-none"
            >
              {t("fin_extra_next")}
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {apiMode ? t("fin_extra_footer_tip_api") : t("fin_extra_footer_tip")}
      </p>
    </div>
  )
}
