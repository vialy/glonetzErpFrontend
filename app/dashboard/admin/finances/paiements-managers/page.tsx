"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Download,
  Search,
  ShieldAlert,
  Wallet,
  XCircle,
} from "lucide-react"
import { formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { useFinanceContext } from "../finance-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/hooks/use-locale"

function StatusBadge({ status }: { status: "pending" | "success" | "failed" | undefined }) {
  const { t } = useLocale()
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-400">
        <CheckCircle2 className="size-3" /> {t("fin_mgr_pay_badge_success")}
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive ring-1 ring-destructive/20">
        <XCircle className="size-3" /> {t("fin_mgr_pay_badge_failed")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300">
      <Clock3 className="size-3" /> {t("fin_mgr_pay_badge_pending")}
    </span>
  )
}

export default function ManagerPaymentsPage() {
  const { t } = useLocale()
  const { operations, wallets, managerAppBalances, settleManagerTransfer, validateFailedTransferAfterCheck } =
    useFinanceContext()
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "success" | "failed">("all")
  const [managerFilter, setManagerFilter] = useState("all")
  const [walletFilter, setWalletFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [referenceQuery, setReferenceQuery] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [verifyTargetId, setVerifyTargetId] = useState<string | null>(null)
  const [verifyNote, setVerifyNote] = useState("")
  const [verifyExternalRef, setVerifyExternalRef] = useState("")

  const filteredOps = useMemo(
    () =>
      operations
        .filter((op) => op.type === "manager_allocation")
        .filter((op) => (statusFilter === "all" ? true : op.transferStatus === statusFilter))
        .filter((op) => (managerFilter === "all" ? true : op.managerId === managerFilter))
        .filter((op) => (walletFilter === "all" ? true : op.walletId === walletFilter))
        .filter((op) => {
          const d = op.createdAt.slice(0, 10)
          if (dateFrom && d < dateFrom) return false
          if (dateTo && d > dateTo) return false
          return true
        })
        .filter((op) =>
          referenceQuery.trim()
            ? `${op.externalTransactionId ?? ""} ${op.id}`.toLowerCase().includes(referenceQuery.toLowerCase())
            : true
        )
        .slice()
        .reverse(),
    [operations, statusFilter, managerFilter, walletFilter, dateFrom, dateTo, referenceQuery]
  )

  const kpi = useMemo(() => {
    let pending = { count: 0, sum: 0 }
    let success = { count: 0, sum: 0 }
    let failed = { count: 0, sum: 0 }
    for (const op of filteredOps) {
      const s = op.transferStatus
      if (s === "success") {
        success.count += 1
        success.sum += op.amount
      } else if (s === "failed") {
        failed.count += 1
        failed.sum += op.amount
      } else {
        pending.count += 1
        pending.sum += op.amount
      }
    }
    const totalAmount = pending.sum + success.sum + failed.sum
    return { pending, success, failed, totalAmount, rowCount: filteredOps.length }
  }, [filteredOps])

  const managerOptions = useMemo(() => {
    const map = new Map<string, string>()
    operations
      .filter((op) => op.type === "manager_allocation" && op.managerId && op.managerName)
      .forEach((op) => map.set(op.managerId!, op.managerName!))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [operations])

  const pageCount = Math.max(1, Math.ceil(filteredOps.length / pageSize))
  const pagedOps = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOps.slice(start, start + pageSize)
  }, [filteredOps, page, pageSize])

  const verifyTarget = filteredOps.find((op) => op.id === verifyTargetId) ?? null

  useEffect(() => {
    setPage(1)
  }, [statusFilter, managerFilter, walletFilter, dateFrom, dateTo, referenceQuery])

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  function exportCsv() {
    if (filteredOps.length === 0) {
      toast({ title: t("fin_extra_toast_no_rows"), description: t("fin_extra_toast_no_export") })
      return
    }
    const header = "date,manager,numero,motif,montant,statut,reference_externe,operation_id"
    const rows = filteredOps.map((op) =>
      [
        op.createdAt,
        op.managerName ?? "",
        op.managerPhone ?? "",
        op.label,
        String(op.amount),
        op.transferStatus ?? "",
        op.externalTransactionId ?? "",
        op.id,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `paiements-managers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: t("fin_extra_toast_export_title"),
      description: t("fin_extra_toast_export_desc").replace("{n}", String(filteredOps.length)),
    })
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 px-4 py-4 text-primary-foreground sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-semibold tracking-tight">{t("fin_mgr_pay_title")}</p>
              <p className="mt-1 max-w-xl text-sm text-primary-foreground/85">{t("fin_mgr_pay_sub")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <Download className="size-3.5" />
                {t("fin_mgr_pay_export")}
              </button>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-2 border-t bg-muted/20 p-3 sm:grid-cols-4 sm:p-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Clock3 className="size-3.5 text-amber-600" /> {t("fin_mgr_pay_kpi_pending")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{kpi.pending.count}</p>
            <p className="text-xs text-muted-foreground">{formatFcfa(kpi.pending.sum)}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> {t("fin_mgr_pay_kpi_success")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{kpi.success.count}</p>
            <p className="text-xs text-muted-foreground">{formatFcfa(kpi.success.sum)}</p>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <XCircle className="size-3.5 text-destructive" /> {t("fin_mgr_pay_kpi_failed")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{kpi.failed.count}</p>
            <p className="text-xs text-muted-foreground">{formatFcfa(kpi.failed.sum)}</p>
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 sm:col-span-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <ArrowDownToLine className="size-3.5 text-primary" /> {t("fin_mgr_pay_kpi_volume")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatFcfa(kpi.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">
              {kpi.rowCount} {t("fin_mgr_pay_movements")}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <p className="text-sm font-semibold">{t("fin_mgr_pay_filters")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("fin_mgr_pay_filters_hint")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_lbl_status")}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">{t("fin_mgr_pay_opt_all_status")}</option>
              <option value="pending">{t("fin_mgr_pay_opt_pending")}</option>
              <option value="success">{t("fin_mgr_pay_opt_success")}</option>
              <option value="failed">{t("fin_mgr_pay_opt_failed")}</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_lbl_manager")}</span>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">{t("fin_mgr_pay_opt_all_managers")}</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_lbl_wallet")}</span>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">{t("fin_mgr_pay_opt_all_wallets")}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_lbl_from")}</span>
            <input
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_lbl_to")}</span>
            <input
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_lbl_ref")}</span>
            <span className="relative flex">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={referenceQuery}
                onChange={(e) => setReferenceQuery(e.target.value)}
                placeholder={t("fin_mgr_pay_search_ph")}
                className="min-h-10 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm shadow-sm"
              />
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {t("fin_mgr_pay_results")
              .replace("{n}", String(filteredOps.length))
              .replace("{page}", String(page))
              .replace("{total}", String(pageCount))}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("fin_mgr_pay_lines")}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="rounded-xl border bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-[1] border-b bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_date")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_manager")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_phone")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_reason")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_amount")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_status")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_ext")}</th>
                <th className="px-4 py-3 text-right">{t("fin_mgr_pay_th_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedOps.map((op) => (
                <tr
                  key={op.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{op.createdAt}</td>
                  <td className="px-4 py-3 font-medium">{op.managerName ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{op.managerPhone ?? "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3" title={op.label}>
                    {op.label}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatFcfa(op.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={op.transferStatus} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{op.externalTransactionId ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {op.transferStatus === "pending" ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const extRef = `OM-${Date.now()}`
                            const result = settleManagerTransfer(op.id, { status: "success", externalTransactionId: extRef })
                            if (!result.ok) {
                              toast({ title: t("fin_mgr_pay_toast_impossible"), description: result.reason, variant: "destructive" })
                              return
                            }
                            toast({
                              title: t("fin_mgr_pay_toast_confirmed"),
                              description: t("fin_mgr_pay_toast_confirmed_desc").replace("{ref}", extRef),
                            })
                          }}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          {t("fin_mgr_pay_mark_success")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const result = settleManagerTransfer(op.id, { status: "failed", failureReason: t("fin_mgr_pay_fail_reason") })
                            if (!result.ok) {
                              toast({ title: t("fin_mgr_pay_toast_impossible"), description: result.reason, variant: "destructive" })
                              return
                            }
                            toast({ title: t("fin_mgr_pay_toast_failed_title"), description: t("fin_mgr_pay_toast_failed_desc") })
                          }}
                          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted"
                        >
                          {t("fin_mgr_pay_mark_failed")}
                        </button>
                      </div>
                    ) : op.transferStatus === "failed" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyTargetId(op.id)
                          setVerifyNote("")
                          setVerifyExternalRef(op.externalTransactionId ?? "")
                        }}
                        className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"
                      >
                        {t("fin_mgr_pay_validate_after")}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("fin_mgr_pay_processed")}</span>
                    )}
                  </td>
                </tr>
              ))}
              {pagedOps.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={8}>
                    {t("fin_mgr_pay_empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {pagedOps.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            {t("fin_mgr_pay_empty")}
          </div>
        ) : (
          pagedOps.map((op) => (
            <div
              key={op.id}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                <div>
                  <p className="font-semibold">{op.managerName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{op.createdAt}</p>
                </div>
                <StatusBadge status={op.transferStatus} />
              </div>
              <div className="space-y-2 px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("fin_mgr_pay_mobile_amount")}</span>
                  <span className="font-semibold tabular-nums">{formatFcfa(op.amount)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("fin_mgr_pay_mobile_phone")}</span>
                  <span className="tabular-nums">{op.managerPhone ?? "—"}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("fin_mgr_pay_mobile_reason")}</p>
                  <p className="mt-0.5">{op.label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("fin_mgr_pay_mobile_ext")}</p>
                  <p className="mt-0.5 font-mono text-xs">{op.externalTransactionId ?? "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-3">
                {op.transferStatus === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const extRef = `OM-${Date.now()}`
                        const result = settleManagerTransfer(op.id, { status: "success", externalTransactionId: extRef })
                        if (!result.ok) {
                          toast({ title: t("fin_mgr_pay_toast_impossible"), description: result.reason, variant: "destructive" })
                          return
                        }
                        toast({
                          title: t("fin_mgr_pay_toast_confirmed"),
                          description: t("fin_mgr_pay_toast_confirmed_desc").replace("{ref}", extRef),
                        })
                      }}
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      {t("fin_mgr_pay_opt_success")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const result = settleManagerTransfer(op.id, { status: "failed", failureReason: t("fin_mgr_pay_fail_reason") })
                        if (!result.ok) {
                          toast({ title: t("fin_mgr_pay_toast_impossible"), description: result.reason, variant: "destructive" })
                          return
                        }
                        toast({ title: t("fin_mgr_pay_toast_failed_title"), description: t("fin_mgr_pay_toast_failed_desc") })
                      }}
                      className="flex-1 rounded-xl border bg-background px-3 py-2 text-xs font-semibold"
                    >
                      {t("fin_mgr_pay_opt_failed")}
                    </button>
                  </>
                ) : op.transferStatus === "failed" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyTargetId(op.id)
                      setVerifyNote("")
                      setVerifyExternalRef(op.externalTransactionId ?? "")
                    }}
                    className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {t("fin_mgr_pay_validate_after")}
                  </button>
                ) : (
                  <p className="w-full text-center text-xs text-muted-foreground">{t("fin_mgr_pay_processed")}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filteredOps.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("fin_mgr_pay_page_nav").replace("{page}", String(page)).replace("{total}", String(pageCount))}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-9 flex-1 rounded-xl border bg-background px-3 text-xs font-semibold transition hover:bg-muted disabled:opacity-50 sm:flex-none"
            >
              {t("fin_extra_prev")}
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="min-h-9 flex-1 rounded-xl border bg-background px-3 text-xs font-semibold transition hover:bg-muted disabled:opacity-50 sm:flex-none"
            >
              {t("fin_extra_next")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Manager app balances */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white dark:from-slate-800 dark:to-slate-900">
          <Wallet className="size-4 opacity-90" />
          <div>
            <p className="text-sm font-semibold">{t("fin_mgr_pay_balances_title")}</p>
            <p className="text-xs text-white/75">{t("fin_mgr_pay_balances_sub")}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {managerOptions.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/15 px-4 py-3 transition hover:border-primary/25 hover:bg-muted/25"
            >
              <p className="font-medium">{m.name}</p>
              <p className="text-sm font-semibold tabular-nums text-primary">{formatFcfa(managerAppBalances[m.id] ?? 0)}</p>
            </div>
          ))}
          {managerOptions.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">{t("fin_mgr_pay_no_managers")}</p>
          ) : null}
        </div>
      </div>

      <Dialog open={Boolean(verifyTargetId)} onOpenChange={(open) => !open && setVerifyTargetId(null)}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4 text-white">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" />
              <div>
                <DialogTitle className="text-lg text-white">{t("fin_mgr_pay_dialog_title")}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/90">
                  {verifyTarget
                    ? t("fin_mgr_pay_dialog_desc").replace("{name}", verifyTarget.managerName ?? "—")
                    : t("fin_mgr_pay_dialog_desc_fallback")}
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {verifyTarget ? (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("fin_mgr_pay_dialog_recap")}</p>
                <div className="mt-2 grid gap-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("fin_mgr_pay_dialog_amount")}</span>
                    <span className="font-semibold">{formatFcfa(verifyTarget.amount)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("fin_mgr_pay_dialog_phone")}</span>
                    <span className="tabular-nums">{verifyTarget.managerPhone ?? "—"}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_ext_optional")}</label>
              <input
                value={verifyExternalRef}
                onChange={(e) => setVerifyExternalRef(e.target.value)}
                placeholder={t("fin_mgr_pay_ext_ph")}
                className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("fin_mgr_pay_verify_required")}</label>
              <textarea
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder={t("fin_mgr_pay_verify_ph")}
                className="min-h-28 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>
          <DialogFooter className="border-t bg-muted/20 px-5 py-4">
            <button
              type="button"
              onClick={() => setVerifyTargetId(null)}
              className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold"
            >
              {t("fin_mgr_pay_cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!verifyTargetId) return
                const result = validateFailedTransferAfterCheck(verifyTargetId, {
                  verificationNote: verifyNote,
                  externalTransactionId: verifyExternalRef,
                })
                if (!result.ok) {
                  toast({ title: t("fin_mgr_pay_toast_val_fail"), description: result.reason, variant: "destructive" })
                  return
                }
                setVerifyTargetId(null)
                toast({
                  title: t("fin_mgr_pay_toast_val_ok"),
                  description: t("fin_mgr_pay_toast_val_ok_desc"),
                })
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
            >
              {t("fin_mgr_pay_confirm_validation")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
