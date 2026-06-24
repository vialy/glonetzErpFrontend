"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarRange, Download, Search, TrendingDown, Wallet } from "lucide-react"
import { adminExpenses, formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"

type ExtraRow = {
  id: string
  createdAt: string
  label: string
  amount: number
  walletId: string
  source: "session" | "seed"
}

export default function DepensesExtraordinairesPage() {
  const { t } = useLocale()
  const { operations, wallets, addExtraExpense } = useFinanceContext()
  const [extraWalletId, setExtraWalletId] = useState(wallets[0]?.id ?? "")
  const [extraLabel, setExtraLabel] = useState("")
  const [extraAmount, setExtraAmount] = useState("")
  const extraWallet = wallets.find((wallet) => wallet.id === extraWalletId)
  const [walletFilter, setWalletFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const allRows = useMemo<ExtraRow[]>(() => {
    const fromOps: ExtraRow[] = operations
      .filter((op) => op.type === "extra_expense")
      .map((op) => ({
        id: op.id,
        createdAt: op.createdAt.slice(0, 10),
        label: op.label,
        amount: op.amount,
        walletId: op.walletId,
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
        source: "seed",
      }))
    return [...fromSeed, ...fromOps].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }, [operations])

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

  const kpiTotal = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered])

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

  function walletName(id: string) {
    return wallets.find((w) => w.id === id)?.name ?? id
  }

  function exportCsv() {
    if (filtered.length === 0) {
      toast({ title: t("fin_extra_toast_no_rows"), description: t("fin_extra_toast_no_export") })
      return
    }
    const header = "date,motif,montant,portefeuille,operation_id,source"
    const rows = filtered.map((r) =>
      [r.createdAt, r.label, String(r.amount), walletName(r.walletId), r.id, r.source]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
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

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 px-4 py-4 text-white sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <TrendingDown className="size-5" />
                {t("fin_extra_title")}
              </p>
              <p className="mt-1 max-w-2xl text-sm text-white/90">{t("fin_extra_sub")}</p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/20"
            >
              <Download className="size-3.5" />
              {t("fin_extra_export")}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t bg-muted/20 p-3 sm:grid-cols-3 sm:p-4">
          <div className="rounded-xl border border-white/10 bg-background/80 p-3 dark:bg-background/40">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("fin_extra_kpi_lines")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/80 p-3 dark:bg-background/40">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("fin_extra_kpi_total")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatFcfa(kpiTotal)}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-3 sm:col-span-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarRange className="size-3.5" /> {t("fin_extra_period")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dateFrom || dateTo
                ? t("fin_extra_period_range")
                    .replace("{from}", dateFrom || t("fin_extra_ellipsis"))
                    .replace("{to}", dateTo || t("fin_extra_ellipsis"))
                : t("fin_extra_period_none")}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-white">
          <p className="text-sm font-semibold">{t("fin_alloc_extra_title")}</p>
          <p className="mt-0.5 text-xs text-white/90">{t("fin_alloc_extra_sub")}</p>
        </div>
        <div className="p-3 sm:p-4">
          <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs">
            <p className="text-muted-foreground">{t("fin_alloc_available")}</p>
            <p className="mt-0.5 font-semibold text-foreground">{formatFcfa(extraWallet?.currentBalance ?? 0)}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground sm:col-span-2">
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
            <label className="block text-xs font-medium text-muted-foreground">
              {t("fin_alloc_motif")}
              <input
                value={extraLabel}
                onChange={(e) => setExtraLabel(e.target.value)}
                placeholder={t("fin_alloc_extra_motif_ph")}
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("fin_alloc_amount")}
              <input
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                type="number"
                placeholder={t("fin_alloc_amount_ph")}
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            onClick={() => {
              const result = addExtraExpense(extraWalletId, extraLabel, Number(extraAmount))
              if (!result.ok) {
                toast({ title: t("fin_alloc_extra_toast_refuse"), description: result.reason, variant: "destructive" })
                return
              }
              setExtraLabel("")
              setExtraAmount("")
              toast({ title: t("fin_alloc_extra_toast_ok_title"), description: t("fin_alloc_extra_toast_ok_desc") })
            }}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground sm:w-auto"
          >
            <TrendingDown className="size-4" /> {t("fin_alloc_extra_btn")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <p className="text-sm font-semibold">{t("fin_extra_filters")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_extra_wallet")}</span>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">{t("fin_extra_all_wallets")}</option>
              {wallets.map((w) => (
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
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
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
              {paged.map((row) => (
                <tr key={row.id} className="border-b border-border/60 transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.createdAt}</td>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="size-3.5 shrink-0" />
                      {walletName(row.walletId)}
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
              ))}
              {paged.length === 0 ? (
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
        {paged.length === 0 ? (
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
                {walletName(row.walletId)}
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

      <p className="text-xs text-muted-foreground">{t("fin_extra_footer_tip")}</p>
    </div>
  )
}
