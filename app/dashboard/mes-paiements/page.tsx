"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, CircleAlert, Clock3, Download, Info, ReceiptText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MobileBackButton } from "@/components/mobile-back-button"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { paymentsService, type StudentPaymentRecord, type StudentTuitionSummary } from "@/domains/payments"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

type PaymentStatus = "paye" | "en_cours" | "rejetee"

interface PaymentLine {
  id: string
  date: string
  amount: number
  method: StudentPaymentRecord["paymentMethod"]
  status: PaymentStatus
  sourceType: "payment" | "claim"
  note?: string
  transactionReference?: string
  phoneNumber?: string
  description?: string
}

function StatusBadge({ status, t }: { status: PaymentStatus; t: (k: TranslationKey) => string }) {
  if (status === "paye") {
    return (
      <Badge className="inline-flex items-center gap-1 bg-green-500/15 text-green-700 hover:bg-green-500/20 dark:text-green-400">
        <CheckCircle2 className="size-3" />
        {t("mp_status_paid")}
      </Badge>
    )
  }
  if (status === "en_cours") {
    return (
      <Badge className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
        <Clock3 className="size-3" />
        {t("mp_status_progress")}
      </Badge>
    )
  }
  return (
    <Badge className="inline-flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20">
      <CircleAlert className="size-3" />
      {t("mp_status_rejected")}
    </Badge>
  )
}

function buildPaymentLines(payments: StudentPaymentRecord[], claims: ClaimRecord[]): PaymentLine[] {
  const linesFromPayments: PaymentLine[] = payments.map((payment) => ({
    id: payment.paymentId,
    date: payment.paidAt ?? payment.createdAt,
    amount: payment.amount,
    method: payment.paymentMethod,
    status: "paye",
    sourceType: "payment",
    note: payment.note,
  }))

  const appliedClaimIds = new Set(payments.map((payment) => payment.sourceClaimId).filter(Boolean))

  const linesFromClaims: PaymentLine[] = claims
    .filter((claim) => !appliedClaimIds.has(claim.id))
    .map((claim) => ({
      id: claim.id,
      date: claim.createdAt,
      amount: claim.amount,
      method: claim.paymentMethod,
      status: claim.status === "rejetee" ? "rejetee" : claim.status === "resolue" ? "paye" : "en_cours",
      sourceType: "claim",
      transactionReference: claim.transactionReference,
      phoneNumber: claim.phoneNumber,
      description: claim.description,
    }))

  return [...linesFromPayments, ...linesFromClaims].sort((a, b) => (a.date > b.date ? -1 : 1))
}

export default function MesPaiementsPage() {
  const { t, locale } = useLocale()
  const formatFcfa = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} F CFA`
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  const methodLabel = (method: StudentPaymentRecord["paymentMethod"]) => {
    if (method === "orange_money") return t("sp_method_om")
    if (method === "mtn_momo") return t("sp_method_mtn")
    return t("sp_method_cash")
  }

  const [summary, setSummary] = useState<StudentTuitionSummary>({
    studentName: "Etudiant Demo",
    className: "A1",
    totalTuition: 0,
    amountPaid: 0,
    remainingAmount: 0,
  })
  const [payments, setPayments] = useState<StudentPaymentRecord[]>([])
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [selectedPayment, setSelectedPayment] = useState<PaymentLine | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)

  useEffect(() => {
    const refresh = async () => {
      setSummary(await paymentsService.getSummary())
      setPayments(await paymentsService.getPayments())
      setClaims(await claimsService.getAll())
    }
    void refresh()
    window.addEventListener("student-payments-updated", refresh)
    window.addEventListener("claims-updated", refresh)
    return () => {
      window.removeEventListener("student-payments-updated", refresh)
      window.removeEventListener("claims-updated", refresh)
    }
  }, [])

  const paymentLines = buildPaymentLines(payments, claims)
  const paidAmount = useMemo(() => paymentLines.filter((p) => p.status === "paye").reduce((sum, p) => sum + p.amount, 0), [paymentLines])
  const inProgressCount = useMemo(() => paymentLines.filter((p) => p.status === "en_cours").length, [paymentLines])
  const rejectedCount = useMemo(() => paymentLines.filter((p) => p.status === "rejetee").length, [paymentLines])

  const downloadPaymentReceipt = async () => {
    if (!selectedPayment || selectedPayment.status !== "paye" || downloadingReceipt) return
    setDownloadingReceipt(true)
    try {
      const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
      const logoDataUrl = await fetch("/images/logo.png")
        .then((res) => res.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(String(reader.result))
              reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
              reader.readAsDataURL(blob)
            })
        )
        .catch(() => "")

      const sourceLabel =
        selectedPayment.sourceType === "payment" ? t("mp_source_direct") : t("mp_source_claim")
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const left = 16
      const right = pageWidth - 16

      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 42, "F")
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", left, 9, 28, 10)
      }
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.text(t("mp_pdf_title"), left, 28)
      doc.setFontSize(11)
      doc.text(`${t("sp_pdf_ref")} ${selectedPayment.id}`, left, 35)

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(11)
      let y = 56
      const row = (label: string, value: string) => {
        const safe = sanitizeTextForPdf(value)
        doc.setTextColor(71, 85, 105)
        doc.text(label, left, y)
        doc.setTextColor(15, 23, 42)
        doc.text(safe, right, y, { align: "right" })
        doc.setDrawColor(226, 232, 240)
        doc.line(left, y + 2, right, y + 2)
        y += 10
      }

      row(t("sp_pdf_student"), summary.studentName)
      row(t("sp_pdf_class"), summary.className)
      row(t("sp_pdf_date"), formatDate(selectedPayment.date))
      row(t("sp_pdf_method"), methodLabel(selectedPayment.method))
      row(t("sp_pdf_amount_paid"), formatFcfaForPdf(selectedPayment.amount))
      row(t("mp_pdf_source"), sourceLabel)
      row(t("sp_pdf_total_paid"), formatFcfaForPdf(summary.amountPaid))
      row(t("sp_pdf_remain"), formatFcfaForPdf(summary.remainingAmount))

      if (selectedPayment.transactionReference) row(t("mp_row_ref_pay"), selectedPayment.transactionReference)
      if (selectedPayment.phoneNumber) row(t("mp_row_phone"), selectedPayment.phoneNumber)

      if (selectedPayment.note || selectedPayment.description) {
        const text = sanitizeTextForPdf(selectedPayment.note ?? selectedPayment.description ?? "")
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(left, y + 6, right - left, 24, 2, 2, "F")
        doc.setTextColor(71, 85, 105)
        doc.setFontSize(10)
        doc.text(t("mp_pdf_note"), left + 4, y + 14)
        doc.setTextColor(15, 23, 42)
        doc.text(text.slice(0, 90), left + 18, y + 14)
      }

      doc.save(`recu-${selectedPayment.id}.pdf`)
    } finally {
      setDownloadingReceipt(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MobileBackButton />
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-primary to-cyan-500 text-primary-foreground shadow-lg">
        <div className="p-5 md:p-6">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{t("mp_title")}</h1>
          <p className="mt-1 text-sm text-primary-foreground/90">{t("mp_hero_sub")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 bg-black/10 px-5 py-3 text-sm md:grid-cols-2 md:px-6">
          <p className="text-primary-foreground/90">
            {t("mp_class_line")} <span className="font-semibold">{summary.className}</span>
          </p>
          <p className="text-primary-foreground/90 md:text-right">
            {t("mp_remain_line")} <span className="font-semibold">{formatFcfa(summary.remainingAmount)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-primary/20 shadow-sm xl:col-span-2">
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("mp_card_fee_total")}</p>
            <p className="mt-1 text-xl font-bold">{formatFcfa(summary.totalTuition)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("mp_card_paid_total")}</p>
            <p className="mt-1 text-xl font-bold text-primary">{formatFcfa(summary.amountPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("mp_card_remain")}</p>
            <p className="mt-1 text-xl font-bold text-destructive">{formatFcfa(summary.remainingAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("mp_card_valid_sum")}</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{formatFcfa(paidAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("mp_hist_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentLines.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("mp_empty_hint")}
            </div>
          ) : null}

          <div className="hidden overflow-hidden rounded-2xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("mp_th_ref")}</TableHead>
                  <TableHead>{t("mp_col_date")}</TableHead>
                  <TableHead>{t("mp_col_amount")}</TableHead>
                  <TableHead>{t("mp_col_method")}</TableHead>
                  <TableHead>{t("mp_col_status")}</TableHead>
                  <TableHead>{t("mp_th_source")}</TableHead>
                  <TableHead className="text-right">{t("mp_th_action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentLines.map((payment, index) => (
                  <TableRow key={`${payment.id}-${payment.date}-${payment.status}-${index}`}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{formatFcfa(payment.amount)}</TableCell>
                    <TableCell>{methodLabel(payment.method)}</TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} t={t} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.sourceType === "payment" ? t("mp_src_direct_short") : t("mp_src_claim_short")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPayment(payment)}>
                        {t("mp_view_detail")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {paymentLines.map((payment, index) => (
              <div
                key={`${payment.id}-${payment.date}-${payment.status}-${index}`}
                className="rounded-2xl border bg-gradient-to-b from-background to-muted/20 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{payment.id}</p>
                  <StatusBadge status={payment.status} t={t} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(payment.date)} - {methodLabel(payment.method)}
                </p>
                <p className="mt-1 text-sm font-semibold">{formatFcfa(payment.amount)}</p>
                <div className="mt-2">
                  <Badge variant="outline">
                    {payment.sourceType === "payment" ? t("mp_src_direct_short") : t("mp_src_claim_short")}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setSelectedPayment(payment)}>
                  {t("mp_view_detail")}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t("mp_stat_in_progress")}</p>
              <p className="text-xl font-semibold text-amber-700">{inProgressCount}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t("mp_stat_rejected")}</p>
              <p className="text-xl font-semibold text-destructive">{rejectedCount}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t("mp_stat_total")}</p>
              <p className="text-xl font-semibold">{paymentLines.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-4" />
              {t("mp_dialog_title")}
            </DialogTitle>
            <DialogDescription>{t("mp_dialog_desc")}</DialogDescription>
          </DialogHeader>

          {selectedPayment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_th_ref")}</p>
                  <p className="mt-1 font-mono text-sm">{selectedPayment.id}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_col_date")}</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(selectedPayment.date)}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_col_amount")}</p>
                  <p className="mt-1 text-sm font-semibold">{formatFcfa(selectedPayment.amount)}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_col_method")}</p>
                  <p className="mt-1 text-sm font-medium">{methodLabel(selectedPayment.method)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedPayment.status} t={t} />
                <Badge variant="outline">
                  {selectedPayment.sourceType === "payment" ? t("mp_source_direct") : t("mp_source_claim")}
                </Badge>
              </div>

              {selectedPayment.transactionReference || selectedPayment.phoneNumber || selectedPayment.description || selectedPayment.note ? (
                <div className="space-y-2 rounded-xl border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{t("mp_extra_info")}</p>
                  {selectedPayment.transactionReference ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_ref_tx")}</span> {selectedPayment.transactionReference}
                    </p>
                  ) : null}
                  {selectedPayment.phoneNumber ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_pay_phone")}</span> {selectedPayment.phoneNumber}
                    </p>
                  ) : null}
                  {selectedPayment.note ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_note")}</span> {selectedPayment.note}
                    </p>
                  ) : null}
                  {selectedPayment.description ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_desc")}</span> {selectedPayment.description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Info className="size-3.5" />
                  {t("mp_dialog_hint")}
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {selectedPayment?.status === "paye" ? (
              <Button onClick={downloadPaymentReceipt} disabled={downloadingReceipt} className="gap-1.5">
                <Download className="size-3.5" />
                {downloadingReceipt ? t("mp_dl_generating") : t("sp_download")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>
              {t("mp_btn_close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
