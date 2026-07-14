"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  Loader2,
  Receipt,
  Search,
  Wrench,
} from "lucide-react"
import { MobileBackButton } from "@/components/mobile-back-button"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  canDownloadAdminPaymentReceipt,
  generateAdminPaymentReceiptPdf,
} from "@/lib/admin-payment-receipt-pdf"
import {
  computePeriodRange,
  defaultManagerPeriodFilter,
  isIsoDateInPeriod,
  type ManagerPeriodFilterValue,
} from "@/lib/manager-period-range"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"
import type { AdminPaymentItem } from "@/services/admin-mock.service"

type ManagerPaymentsViewProps = {
  payments: AdminPaymentItem[]
  loading?: boolean
}

function formatPaymentDate(createdAt: string) {
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
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`
  }
  return s.length > 14 ? `${s.slice(0, 14)}...` : s
}

function statusBadge(p: AdminPaymentItem, t: (k: TranslationKey) => string) {
  if (p.status === "success") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        {t("pay_list_status_ok")}
      </Badge>
    )
  }
  if (p.status === "pending") {
    return (
      <Badge className="bg-amber-500/15 text-amber-800 hover:bg-amber-500/20">
        <Clock3 className="mr-1 size-3" />
        {t("pay_list_status_wait")}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <Wrench className="mr-1 size-3" />
      {t("pay_list_status_manual")}
    </Badge>
  )
}

function methodLabel(method: AdminPaymentItem["method"], t: (k: TranslationKey) => string) {
  if (method === "Especes") return t("pay_list_method_cash_short")
  return method === "MTN" ? t("pay_list_method_mtn_short") : t("pay_list_method_om_short")
}

export function ManagerPaymentsView({ payments, loading = false }: ManagerPaymentsViewProps) {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`

  const [period, setPeriod] = useState<ManagerPeriodFilterValue>(() => defaultManagerPeriodFilter())
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [receiptViewPayment, setReceiptViewPayment] = useState<AdminPaymentItem | null>(null)
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null)

  const pageSize = 12
  const range = useMemo(() => computePeriodRange(period), [period])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (!isIsoDateInPeriod(p.createdAt, range)) return false
      if (!q) return true
      const hay = `${p.id} ${p.learnerName} ${p.className} ${p.operatorReference ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [payments, query, range])

  const kpis = useMemo(() => {
    const collected = filtered
      .filter((p) => p.status === "success" || p.status === "manual")
      .reduce((sum, p) => sum + p.amount, 0)
    return { collected, count: filtered.length }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [query, period])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  async function downloadReceiptPdf(p: AdminPaymentItem) {
    if (!canDownloadAdminPaymentReceipt(p)) return
    setReceiptBusyId(p.id)
    try {
      const blob = await generateAdminPaymentReceiptPdf(p, {
        issuerFooter: t("pay_list_pdf_footer_mgr"),
      })
      const safeRef = (p.operatorReference ?? p.id).replace(/[^\w.-]+/g, "_")
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = `recu-${safeRef}.pdf`
      a.click()
      URL.revokeObjectURL(href)
    } finally {
      setReceiptBusyId(null)
    }
  }

  const countLabel = t("mgr_list_expenses_count").replace("{n}", String(kpis.count))

  return (
    <div className="mx-auto w-full max-w-none px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-6 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("mgr_payments_title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("mgr_payments_subtitle")}</p>
      </header>

      <div className="mb-6 space-y-4">
        <ManagerPeriodFilter
          value={period}
          onChange={setPeriod}
          hint={t("mgr_list_filter_hint")}
          summary={countLabel}
        />
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

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("pay_list_kpi_amount")}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-32" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(kpis.collected)}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{t("pay_list_kpi_amount_hint")}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("pay_list_kpi_tx")}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-16" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tabular-nums">{kpis.count}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{t("pay_list_kpi_tx_hint")}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
              <CreditCard className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{t("mgr_payments_title")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("mgr_payments_list_hint")}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={`sk-${i}`}>
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </li>
              ))}
            </ul>
          ) : paged.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-14 text-center text-sm text-muted-foreground">
              {t("pay_list_empty_title")}
            </div>
          ) : (
            <ul className="space-y-3">
              {paged.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{p.learnerName}</p>
                      <p className="text-xs text-muted-foreground">{p.className}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {p.operatorReference ?? p.id}
                      </p>
                    </div>
                    <div className="shrink-0">{statusBadge(p, t)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {methodLabel(p.method, t)} - {formatPaymentDate(p.createdAt)}
                      </p>
                    </div>
                    {canDownloadAdminPaymentReceipt(p) ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setReceiptViewPayment(p)}
                        >
                          <Eye className="mr-1.5 size-4" />
                          {t("pay_list_view_receipt")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-xl"
                          disabled={receiptBusyId !== null}
                          onClick={() => void downloadReceiptPdf(p)}
                        >
                          {receiptBusyId === p.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {filtered.length > pageSize ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {t("adm_learn_pagination")} {page} {t("adm_learn_of")} {pageCount}
          </span>
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
      ) : null}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/dashboard/manager/apprenants" className="text-primary underline underline-offset-2">
          {t("mgr_payments_learners_link")}
        </Link>
      </p>

      <Dialog
        open={receiptViewPayment !== null}
        onOpenChange={(open) => {
          if (!open) setReceiptViewPayment(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            {t("pay_list_recv_title")}
          </DialogTitle>
          <DialogDescription>
            {receiptViewPayment
              ? `${receiptViewPayment.learnerName} - ${receiptViewPayment.operatorReference ?? receiptViewPayment.id}`
              : ""}
          </DialogDescription>
          {receiptViewPayment ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("adm_learn_table_class")}</dt>
                <dd className="font-medium">{receiptViewPayment.className}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("pay_list_th_amount")}</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(receiptViewPayment.amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("sp_pdf_date")}</dt>
                <dd>{formatPaymentDate(receiptViewPayment.createdAt)}</dd>
              </div>
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceiptViewPayment(null)}>
              {t("mp_btn_close")}
            </Button>
            {receiptViewPayment ? (
              <Button
                type="button"
                disabled={receiptBusyId !== null}
                onClick={() => void downloadReceiptPdf(receiptViewPayment)}
              >
                {receiptBusyId === receiptViewPayment.id ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {t("pay_list_pdf_short")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
