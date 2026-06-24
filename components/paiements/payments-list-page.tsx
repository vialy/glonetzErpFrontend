"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  Filter,
  Loader2,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MobileBackButton } from "@/components/mobile-back-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  canDownloadAdminPaymentReceipt,
  generateAdminPaymentReceiptPdf,
} from "@/lib/admin-payment-receipt-pdf"
import {
  resolvePendingAdminPaymentToSuccess,
  type AdminPaymentItem,
} from "@/services/admin-mock.service"
import { isApiDataProvider } from "@/lib/data-provider"
import { cn } from "@/lib/utils"
import {
  computePeriodRange,
  defaultManagerPeriodFilter,
  periodRangeToYmd,
  type ManagerPeriodFilterValue,
  type PeriodPreset,
} from "@/lib/manager-period-range"
import {
  PaymentPeriodSelect,
  paymentPeriodLabel,
} from "@/components/paiements/payment-period-select"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

function paymentDateKey(createdAt: string) {
  const s = createdAt.trim()
  if (s.length >= 10) return s.slice(0, 10)
  return s
}

function inDateRange(createdAt: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return true
  const d = paymentDateKey(createdAt)
  const lo = dateFrom || "1970-01-01"
  const hi = dateTo || "2099-12-31"
  return d >= lo && d <= hi
}

function statusBadge(p: AdminPaymentItem, t: (k: TranslationKey) => string) {
  const badgeClass =
    "inline-flex shrink-0 items-center gap-1 overflow-visible whitespace-nowrap"
  if (p.status === "success") {
    return (
      <Badge className={cn(badgeClass, "bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300")}>
        <CheckCircle2 className="size-3 shrink-0" />
        {t("pay_list_status_ok")}
      </Badge>
    )
  }
  if (p.status === "pending") {
    return (
      <Badge className={cn(badgeClass, "bg-amber-500/15 text-amber-800 hover:bg-amber-500/20")}>
        <Clock3 className="size-3 shrink-0" />
        {t("pay_list_status_wait")}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className={badgeClass}>
      <Wrench className="size-3 shrink-0" />
      {t("pay_list_status_manual")}
    </Badge>
  )
}

function adminPaymentMethodLabel(method: AdminPaymentItem["method"], t: (k: TranslationKey) => string) {
  if (method === "Especes") return t("pay_list_method_cash_full")
  return method === "MTN" ? t("pay_list_method_mtn") : t("pay_list_method_om")
}

function adminPaymentMethodShortLabel(method: AdminPaymentItem["method"], t: (k: TranslationKey) => string) {
  if (method === "Especes") return t("pay_list_method_cash_short")
  return method === "MTN" ? t("pay_list_method_mtn_short") : t("pay_list_method_om_short")
}

function formatPaymentTableDate(createdAt: string) {
  const s = createdAt.trim()
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (match) {
    const [, year, month, day, hour, minute] = match
    const shortYear = year!.slice(2)
    if (hour && minute) return `${day}/${month}/${shortYear} ${hour}:${minute}`
    return `${day}/${month}/${shortYear}`
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return s.length > 14 ? `${s.slice(0, 14)}…` : s
}

function adminPaymentStatusLabel(status: AdminPaymentItem["status"], t: (k: TranslationKey) => string) {
  if (status === "success") return t("pay_list_status_ok")
  if (status === "pending") return t("pay_list_status_wait")
  return t("pay_list_manual_entry")
}

function PaymentReceiptPremiumCard({
  p,
  previewLine,
  t,
  formatMoney,
}: {
  p: AdminPaymentItem
  previewLine: string
  t: (k: TranslationKey) => string
  formatMoney: (value: number) => string
}) {
  const ref = p.operatorReference ?? p.id
  const rows: { label: string; value: string }[] = [
    { label: t("adm_learn_table_name"), value: p.learnerName },
    { label: t("adm_learn_table_class"), value: p.className },
    { label: t("sp_pdf_date"), value: p.createdAt },
    { label: t("sp_pdf_method"), value: adminPaymentMethodLabel(p.method, t) },
    { label: t("mp_col_status"), value: adminPaymentStatusLabel(p.status, t) },
    { label: t("pay_list_row_txid"), value: p.id },
  ]
  if (p.operatorReference) rows.push({ label: t("pay_list_row_op_ref"), value: p.operatorReference })
  if (p.learnerId) rows.push({ label: t("pay_list_row_learner_id"), value: p.learnerId })

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card via-card to-muted/30 shadow-[0_32px_64px_-24px_rgba(15,23,42,0.45)] ring-1 ring-black/5 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 dark:ring-white/10">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-48 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative px-6 pb-8 pt-9 sm:px-10 sm:pb-10 sm:pt-11">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/25">
                <Receipt className="size-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
                Glonetz
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
              {t("pay_list_recv_title")}
            </h3>
            <p className="font-mono text-xs text-muted-foreground">{ref}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 px-5 py-4 text-right shadow-inner">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pay_list_amount_paid")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
              {formatMoney(p.amount)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border/70 bg-muted/25 shadow-inner dark:bg-white/[0.03]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 border-b border-border/50 px-4 py-3.5 last:border-b-0 sm:px-5"
            >
              <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
              <span className="max-w-[58%] text-right text-sm font-semibold leading-snug text-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="size-3.5 text-amber-500/90" />
          <span>{previewLine}</span>
        </div>
      </div>
    </div>
  )
}

export type PaymentsListPageProps = {
  payments: AdminPaymentItem[]
  pageTitle: string
  pageSubtitle: string
  exportFilenamePrefix: string
  receiptPreviewLine: string
  pdfIssuerFooter: string
  loading?: boolean
}

export function PaymentsListPage({
  payments,
  pageTitle,
  pageSubtitle,
  exportFilenamePrefix,
  receiptPreviewLine,
  pdfIssuerFooter,
  loading = false,
}: PaymentsListPageProps) {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const [query, setQuery] = useState("")
  const [periodFilter, setPeriodFilter] = useState<ManagerPeriodFilterValue>(defaultManagerPeriodFilter())
  const dateBounds = useMemo(
    () => periodRangeToYmd(computePeriodRange(periodFilter)),
    [periodFilter],
  )
  const [statusFilter, setStatusFilter] = useState<"all" | AdminPaymentItem["status"]>("all")
  const [methodFilter, setMethodFilter] = useState<"all" | AdminPaymentItem["method"]>("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [receiptViewPayment, setReceiptViewPayment] = useState<AdminPaymentItem | null>(null)
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null)
  // En mode API, la validation manuelle d'un paiement en attente passe par la
  // passerelle/webhook : on ne propose pas l'action locale (pas d'endpoint dedie).
  const canManuallyValidate = !isApiDataProvider()

  const classNames = useMemo(() => {
    const s = new Set<string>()
    // On ignore les classes vides : un SelectItem ne peut pas avoir value="".
    payments.forEach((p) => {
      const name = p.className?.trim()
      if (name) s.add(name)
    })
    return [...s].sort()
  }, [payments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (!inDateRange(p.createdAt, dateBounds.from, dateBounds.to)) return false
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (methodFilter !== "all" && p.method !== methodFilter) return false
      if (classFilter !== "all" && p.className !== classFilter) return false
      if (!q) return true
      const hay = `${p.id} ${p.learnerName} ${p.className} ${p.operatorReference ?? ""} ${p.method}`.toLowerCase()
      return hay.includes(q)
    })
  }, [payments, query, dateBounds.from, dateBounds.to, statusFilter, methodFilter, classFilter])

  const periodActive =
    periodFilter.preset !== "all" &&
    !(periodFilter.preset === "custom" && (!periodFilter.customFrom.trim() || !periodFilter.customTo.trim()))

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        query.trim() ||
          periodActive ||
          statusFilter !== "all" ||
          methodFilter !== "all" ||
          classFilter !== "all",
      ),
    [query, periodActive, statusFilter, methodFilter, classFilter],
  )
  const advancedFilterCount = useMemo(() => {
    let count = 0
    if (methodFilter !== "all") count += 1
    if (classFilter !== "all") count += 1
    return count
  }, [methodFilter, classFilter])

  const kpis = useMemo(() => {
    const total = filtered.reduce((s, p) => s + p.amount, 0)
    const pending = filtered.filter((p) => p.status === "pending").length
    const success = filtered.filter((p) => p.status === "success").length
    return { total, pending, success, count: filtered.length }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [query, periodFilter, statusFilter, methodFilter, classFilter, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function openReceiptPreview(p: AdminPaymentItem) {
    if (!canDownloadAdminPaymentReceipt(p)) return
    setReceiptViewPayment(p)
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = filename
    a.click()
    URL.revokeObjectURL(href)
  }

  async function downloadReceiptPdf(p: AdminPaymentItem) {
    if (!canDownloadAdminPaymentReceipt(p)) return
    setReceiptBusyId(p.id)
    try {
      const blob = await generateAdminPaymentReceiptPdf(p, { issuerFooter: pdfIssuerFooter })
      const safeRef = (p.operatorReference ?? p.id).replace(/[^\w.-]+/g, "_")
      triggerBlobDownload(blob, `recu-${safeRef}.pdf`)
    } finally {
      setReceiptBusyId(null)
    }
  }

  function resetFilters() {
    setQuery("")
    setPeriodFilter(defaultManagerPeriodFilter())
    setStatusFilter("all")
    setMethodFilter("all")
    setClassFilter("all")
  }

  function setPeriodPreset(preset: PeriodPreset) {
    if (preset === "custom") {
      setPeriodFilter((prev) => ({ ...prev, preset: "custom" }))
      return
    }
    setPeriodFilter({ preset, customFrom: "", customTo: "" })
  }

  const validatePending = async (id: string) => {
    setActingId(id)
    setBanner(null)
    try {
      await new Promise((r) => setTimeout(r, 350))
      const { updated } = resolvePendingAdminPaymentToSuccess(id)
      setBanner({
        type: "success",
        text: updated ? t("pay_list_validate_ok") : t("pay_list_validate_no"),
      })
    } catch {
      setBanner({ type: "error", text: t("pay_list_err_action") })
    } finally {
      setActingId(null)
    }
  }

  function exportCsv() {
    if (filtered.length === 0) {
      setBanner({ type: "error", text: t("pay_list_err_export") })
      return
    }
    const header = "id,date,reference,apprenant,classe,montant,methode,statut"
    const rows = filtered.map((p) =>
      [
        p.id,
        p.createdAt,
        p.operatorReference ?? "",
        p.learnerName,
        p.className,
        String(p.amount),
        p.method,
        p.status,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${exportFilenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setBanner({
      type: "success",
      text: `${filtered.length} ${t("pay_list_export_suffix")}`,
    })
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-28 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard" />
        <AdminPageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          gradientClassName="from-emerald-700 via-teal-600 to-cyan-600"
          actions={
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-white/20"
            >
              <Download className="size-3.5" />
              {t("pay_list_export_csv")}
            </button>
          }
        />

        {banner ? (
          <div
            className={cn(
              "mt-4 rounded-xl border px-4 py-3 text-sm",
              banner.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {banner.text}
          </div>
        ) : null}

        {/* Filtres premium */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-slate-900 via-emerald-900/95 to-teal-900 px-4 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">{t("adm_learn_filters")}</p>
                <p className="mt-0.5 text-xs text-white/75">{t("pay_list_filters_hint_pay")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  {t("adm_learn_filters_active")}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                  {t("adm_learn_filters_full")} ({payments.length} {t("pay_list_payments_plural")})
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowMoreFilters((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <SlidersHorizontal className="size-3.5" />
                {showMoreFilters ? t("adm_learn_less_filters") : t("adm_learn_more_filters")}
                {!showMoreFilters && advancedFilterCount > 0 ? (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] leading-none">{advancedFilterCount}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                {t("adm_learn_reset")}
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CalendarDays className="size-3.5 text-teal-600" />
                  {t("pay_list_period_pay")}
                </div>
                <PaymentPeriodSelect
                  className="w-full min-w-0 sm:flex-1 sm:max-w-none"
                  value={periodFilter.preset}
                  onChange={setPeriodPreset}
                />
              </div>
              {periodActive ? (
                <p className="text-[11px] text-muted-foreground">
                  {t("pay_list_period_scope")}{" "}
                  <span className="font-semibold text-foreground">
                    {paymentPeriodLabel(periodFilter.preset, t)}
                  </span>
                  {dateBounds.from && dateBounds.to ? (
                    <span className="font-mono text-foreground/80">
                      {" "}
                      ({dateBounds.from} → {dateBounds.to})
                    </span>
                  ) : null}
                </p>
              ) : null}
              {periodFilter.preset === "custom" ? (
                <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-background/80 p-3">
                  <p className="text-[11px] text-muted-foreground">{t("pay_list_period_custom_hint")}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {t("adm_learn_date_from")}
                      </span>
                      <input
                        type="date"
                        value={periodFilter.customFrom}
                        onChange={(e) =>
                          setPeriodFilter((prev) => ({ ...prev, customFrom: e.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {t("adm_learn_date_to")}
                      </span>
                      <input
                        type="date"
                        value={periodFilter.customTo}
                        onChange={(e) =>
                          setPeriodFilter((prev) => ({ ...prev, customTo: e.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 rounded-xl pl-9"
                  placeholder={t("pay_list_search_ph")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="size-3.5 text-emerald-600" />
                {t("adm_learn_refinement")}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">{t("pay_list_lbl_status")}</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("adm_learn_opt_all")}</SelectItem>
                      <SelectItem value="success">{t("pay_list_st_valid")}</SelectItem>
                      <SelectItem value="pending">{t("pay_list_st_pending")}</SelectItem>
                      <SelectItem value="manual">{t("pay_list_st_manual")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showMoreFilters ? (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">{t("pay_list_lbl_method")}</Label>
                    <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as typeof methodFilter)}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("pay_list_m_all")}</SelectItem>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="Orange">Orange</SelectItem>
                        <SelectItem value="Especes">Especes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              {showMoreFilters ? (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">{t("pay_list_lbl_class_label")}</Label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("adm_learn_opt_all_classes")}</SelectItem>
                      {classNames.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
                  {advancedFilterCount > 0
                    ? `${advancedFilterCount} ${t("adm_learn_adv_active")}`
                    : t("adm_learn_more_filters")}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            <span className="font-medium text-foreground">
              {kpis.count}{" "}
              {kpis.count === 1 ? t("pay_list_payment_one") : t("pay_list_payments_plural")}{" "}
              {t("adm_learn_scope")}
            </span>
            {kpis.count === 0 ? (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                {t("pay_list_no_kpi")}
              </span>
            ) : null}
          </div>
        </div>

        {/* KPI */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("adm_learn_synth")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/15 via-cyan-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("pay_list_kpi_amount")}</p>
                <span className="inline-flex rounded-full bg-cyan-500/15 p-1.5 text-cyan-700">
                  <CreditCard className="size-4" />
                </span>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-28" />
              ) : (
                <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{formatMoney(kpis.total)}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t("pay_list_kpi_amount_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cyan-700/10">
                <div className="h-full w-full bg-gradient-to-r from-cyan-500/55 via-sky-500/45 to-indigo-500/50" />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/15 via-violet-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("pay_list_kpi_tx")}</p>
                <span className="inline-flex rounded-full bg-violet-500/15 p-1.5 text-violet-700">
                  <Receipt className="size-4" />
                </span>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{kpis.count}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t("pay_list_kpi_tx_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-700/10">
                <div className="h-full w-full bg-gradient-to-r from-violet-500/55 via-fuchsia-500/45 to-cyan-500/50" />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/15 via-emerald-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("pay_list_kpi_ok")}</p>
                <span className="inline-flex rounded-full bg-emerald-500/15 p-1.5 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                </span>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{kpis.success}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t("pay_list_kpi_ok_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-700/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500/55 via-teal-500/45 to-cyan-500/50"
                  style={{ width: `${Math.min(100, kpis.count > 0 ? Math.round((kpis.success / kpis.count) * 100) : 0)}%` }}
                />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/15 via-amber-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("pay_list_kpi_pending")}</p>
                <span className="inline-flex rounded-full bg-amber-500/15 p-1.5 text-amber-700">
                  <Clock3 className="size-4" />
                </span>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{kpis.pending}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t("pay_list_kpi_pending_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-700/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500/55 via-orange-500/45 to-rose-500/50"
                  style={{ width: `${Math.max(12, Math.min(100, kpis.count > 0 ? Math.round((kpis.pending / kpis.count) * 100) : 0))}%` }}
                />
              </div>
            </article>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 hidden rounded-2xl border border-border/80 bg-card shadow-sm md:block [&_[data-slot=table-container]]:overflow-x-visible">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[10%]">{t("pay_list_th_ref")}</TableHead>
                <TableHead className="w-[16%]">{t("adm_learn_table_name")}</TableHead>
                <TableHead className="w-[14%]">{t("adm_learn_table_class")}</TableHead>
                <TableHead className="w-[12%] text-right">{t("pay_list_th_amount")}</TableHead>
                <TableHead className="w-[11%]">{t("pay_list_lbl_status")}</TableHead>
                <TableHead className="w-[8%]">{t("pay_list_lbl_method")}</TableHead>
                <TableHead className="w-[11%]">{t("mp_col_date")}</TableHead>
                <TableHead className="w-[18%] text-right">{t("pay_list_th_action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <AdminEmptyState
                      title={t("pay_list_empty_title")}
                      description={t("pay_list_empty_desc")}
                      action={
                        <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                          {t("adm_learn_reset")}
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="truncate font-mono text-xs" title={p.operatorReference ?? p.id}>
                      {p.operatorReference ?? p.id}
                    </TableCell>
                    <TableCell className="truncate font-medium" title={p.learnerName}>
                      {p.learnerName}
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground" title={p.className}>
                      {p.className}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(p.amount)}</TableCell>
                    <TableCell className="whitespace-normal">
                      {statusBadge(p, t)}
                    </TableCell>
                    <TableCell className="text-xs font-medium" title={adminPaymentMethodLabel(p.method, t)}>
                      {adminPaymentMethodShortLabel(p.method, t)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground" title={p.createdAt}>
                      {formatPaymentTableDate(p.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {p.status === "pending" && canManuallyValidate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={actingId !== null}
                            onClick={() => void validatePending(p.id)}
                          >
                            {actingId === p.id ? t("pay_list_validating_short") : t("pay_list_validate")}
                          </Button>
                        ) : null}
                        {canDownloadAdminPaymentReceipt(p) ? (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-9 shrink-0 rounded-xl text-teal-700 hover:bg-teal-500/15 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
                              disabled={receiptBusyId !== null}
                              aria-label={t("pay_list_aria_view")}
                              title={t("pay_list_title_view")}
                              onClick={() => void openReceiptPreview(p)}
                            >
                              {receiptBusyId === p.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-9 shrink-0 rounded-xl text-slate-700 hover:bg-slate-500/10 dark:text-slate-300"
                              disabled={receiptBusyId !== null}
                              aria-label={t("pay_list_aria_dl")}
                              title={t("pay_list_title_dl")}
                              onClick={() => void downloadReceiptPdf(p)}
                            >
                              {receiptBusyId === p.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Download className="size-4" />
                              )}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile */}
        <div className="mt-4 space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`skm-${i}`} className="h-28 w-full rounded-2xl" />
            ))
          ) : paged.length === 0 ? (
            <AdminEmptyState
              title={t("pay_list_empty_title")}
              description={t("pay_list_empty_desc_mob")}
              action={
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  {t("adm_learn_reset")}
                </Button>
              }
            />
          ) : (
            paged.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border/80 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{p.operatorReference ?? p.id}</p>
                    <p className="mt-1 font-semibold">{p.learnerName}</p>
                    <p className="text-xs text-muted-foreground">{p.className}</p>
                  </div>
                  <div className="shrink-0">{statusBadge(p, t)}</div>
                </div>
                <p className="mt-3 text-lg font-bold tabular-nums">{formatMoney(p.amount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {adminPaymentMethodShortLabel(p.method, t)} · {formatPaymentTableDate(p.createdAt)}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {p.status === "pending" && canManuallyValidate ? (
                    <Button
                      className="w-full rounded-xl"
                      variant="outline"
                      disabled={actingId !== null}
                      onClick={() => void validatePending(p.id)}
                    >
                      {actingId === p.id ? t("pay_list_mobile_validating") : t("pay_list_mobile_validate")}
                    </Button>
                  ) : null}
                  {canDownloadAdminPaymentReceipt(p) ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 rounded-xl"
                        disabled={receiptBusyId !== null}
                        onClick={() => void openReceiptPreview(p)}
                      >
                        {receiptBusyId === p.id ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Eye className="mr-2 size-4" />
                        )}
                        {t("pay_list_view_receipt")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 rounded-xl"
                        disabled={receiptBusyId !== null}
                        onClick={() => void downloadReceiptPdf(p)}
                      >
                        {receiptBusyId === p.id ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 size-4" />
                        )}
                        {t("pay_list_pdf_short")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("adm_learn_pagination")} {page} {t("adm_learn_of")} {pageCount} · {filtered.length}{" "}
              {t("adm_learn_lines")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {t("adm_learn_per_page_lbl")}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                >
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={page <= 1}
                  onClick={() => setPage((x) => Math.max(1, x - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={page >= pageCount}
                  onClick={() => setPage((x) => Math.min(pageCount, x + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Dialog
          open={receiptViewPayment !== null}
          onOpenChange={(open) => {
            if (!open) setReceiptViewPayment(null)
          }}
        >
          <DialogContent
            showCloseButton
            className="flex max-h-[min(92vh,900px)] max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden border-0 bg-transparent p-3 shadow-none sm:max-w-xl md:max-w-2xl md:p-5 [&_[data-slot=dialog-close]]:right-5 [&_[data-slot=dialog-close]]:top-5 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-white/20 [&_[data-slot=dialog-close]]:bg-white/10 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/20"
          >
            <div className="relative mx-auto w-full max-w-xl md:max-w-2xl">
              <div
                className="absolute -inset-[1px] rounded-[26px] bg-gradient-to-br from-emerald-400/80 via-teal-500/50 to-cyan-600/70 opacity-90 blur-[1px] dark:from-emerald-500/40 dark:via-teal-600/30 dark:to-slate-800/80"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-b from-slate-950/95 via-slate-900/98 to-slate-950 shadow-[0_40px_100px_-40px_rgba(6,78,59,0.55)] dark:shadow-black/60">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(52,211,153,0.22),transparent)]" />
                <div className="relative border-b border-white/10 px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <DialogTitle className="flex items-center gap-2 text-left text-xl font-bold tracking-tight text-white sm:text-2xl">
                        <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                          <Eye className="size-5 text-emerald-300" />
                        </span>
                        {t("pay_list_dialog_title")}
                      </DialogTitle>
                      <DialogDescription className="mt-2 text-left text-sm text-emerald-100/85">
                        {receiptViewPayment
                          ? `${receiptViewPayment.learnerName} · ${receiptViewPayment.operatorReference ?? receiptViewPayment.id}`
                          : ""}
                      </DialogDescription>
                    </div>
                    <div className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-200/90 sm:block">
                      {t("pay_list_premium")}
                    </div>
                  </div>
                </div>

                <div className="max-h-[min(58vh,560px)] overflow-y-auto overscroll-contain px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-5">
                  {receiptViewPayment ? (
                    <PaymentReceiptPremiumCard
                      p={receiptViewPayment}
                      previewLine={receiptPreviewLine}
                      t={t}
                      formatMoney={formatMoney}
                    />
                  ) : null}
                </div>

                <DialogFooter className="relative gap-2 border-t border-white/10 bg-black/25 px-4 py-4 backdrop-blur-md sm:justify-between sm:px-6 sm:py-5">
                  <p className="hidden text-[11px] text-slate-400 sm:mr-auto sm:block">
                    {t("pay_list_dialog_pdf_hint")}
                  </p>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
                      onClick={() => setReceiptViewPayment(null)}
                    >
                      {t("mp_btn_close")}
                    </Button>
                    <Button
                      type="button"
                      className="rounded-xl gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500"
                      disabled={!receiptViewPayment || receiptBusyId !== null}
                      onClick={() => {
                        if (receiptViewPayment) void downloadReceiptPdf(receiptViewPayment)
                      }}
                    >
                      {receiptViewPayment && receiptBusyId === receiptViewPayment.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {t("pay_list_dl_pdf")}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
