"use client"

import { useCallback, useEffect, useState } from "react"
import { accountingAuditService } from "@/domains/accounting"
import type { AuditDateRange, AuditFinancialSummary } from "@/domains/accounting/types"
import { defaultAuditDateRange, formatFcfa } from "@/lib/audit-date-range"
import { formatFcfaForPdf } from "@/lib/pdf-text"
import { useLocale } from "@/hooks/use-locale"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function ComptableRapportsPage() {
  const { t } = useLocale()
  const [range, setRange] = useState<AuditDateRange>(() => defaultAuditDateRange())
  const [summary, setSummary] = useState<AuditFinancialSummary | null>(null)
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null)

  useEffect(() => {
    setSummary(accountingAuditService.getSummary(range))
  }, [range])

  const buildCsv = useCallback(() => {
    const payments = accountingAuditService.getPaymentsInRange(range)
    const manager = accountingAuditService.getManagerExpensesInRange(range)
    const extra = accountingAuditService.getExtraordinaryInRange(range)
    const lines: string[] = []
    lines.push(
      [csvEscape("Section"), csvEscape("ID"), csvEscape("Date"), csvEscape("Detail"), csvEscape("Montant XOF")].join(",")
    )
    for (const p of payments) {
      lines.push(
        [
          csvEscape("Encaissement"),
          csvEscape(p.id),
          csvEscape(p.recordedAt),
          csvEscape(`${p.studentName} | ${p.className} | ${p.paymentMethod}${p.externalReference ? ` | ${p.externalReference}` : ""}`),
          csvEscape(String(p.amount)),
        ].join(",")
      )
    }
    for (const m of manager) {
      lines.push(
        [
          csvEscape("Depense manager"),
          csvEscape(m.id),
          csvEscape(m.spentAt),
          csvEscape(`${m.category} | ${m.managerLabel}${m.comment ? ` | ${m.comment}` : ""}`),
          csvEscape(String(m.amount)),
        ].join(",")
      )
    }
    for (const e of extra) {
      lines.push(
        [
          csvEscape("Depense extraordinaire"),
          csvEscape(e.id),
          csvEscape(e.spentAt),
          csvEscape(`${e.description}${e.category ? ` | ${e.category}` : ""}`),
          csvEscape(String(e.amount)),
        ].join(",")
      )
    }
    if (summary) {
      lines.push("")
      lines.push(
        [csvEscape("Synthese"), "", "", csvEscape(`Periode ${range.from} -> ${range.to}`), ""].join(",")
      )
      lines.push([csvEscape("Total encaissements"), "", "", "", csvEscape(String(summary.totalPaymentsIn))].join(","))
      lines.push([csvEscape("Total depenses manager"), "", "", "", csvEscape(String(summary.totalManagerExpenses))].join(","))
      lines.push([csvEscape("Total extraordinaires"), "", "", "", csvEscape(String(summary.totalExtraordinaryExpenses))].join(","))
      lines.push([csvEscape("Solde net theorique"), "", "", "", csvEscape(String(summary.theoreticalNetBalance))].join(","))
    }
    return lines.join("\n")
  }, [range, summary])

  const downloadCsv = useCallback(() => {
    if (!summary) return
    setBusy("csv")
    try {
      const blob = new Blob(["\ufeff", buildCsv()], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `glonetz-audit-${range.from}_${range.to}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }, [buildCsv, range.from, range.to, summary])

  const downloadPdf = useCallback(async () => {
    if (!summary) return
    setBusy("pdf")
    try {
      const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
      const doc = new jsPDF({ unit: "mm", format: "a4" })
      const left = 16
      let y = 18
      doc.setFontSize(16)
      doc.setTextColor(30, 41, 59)
      doc.text("Glonetz — Rapport d’audit (synthese)", left, y)
      y += 10
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(`Periode : ${range.from} au ${range.to}`, left, y)
      y += 8
      doc.text(`${t("acc_readonly_badge")}`, left, y)
      y += 14
      doc.setTextColor(15, 23, 42)
      const row = (label: string, value: string) => {
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text(label, left, y)
        doc.setTextColor(15, 23, 42)
        doc.text(value, left + 85, y)
        y += 7
      }
      row("Encaissements", formatFcfaForPdf(summary.totalPaymentsIn))
      row("Depenses manager", formatFcfaForPdf(summary.totalManagerExpenses))
      row("Depenses extraordinaires", formatFcfaForPdf(summary.totalExtraordinaryExpenses))
      row("Solde net theorique", formatFcfaForPdf(summary.theoreticalNetBalance))
      y += 6
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("Document genere depuis l’espace comptable — donnees a reconcilier avec les comptes reels.", left, y)
      doc.save(`glonetz-audit-${range.from}-${range.to}.pdf`)
    } finally {
      setBusy(null)
    }
  }, [range.from, range.to, summary, t])

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5 pb-28 md:max-w-xl md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-8 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("acc_rep_title")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("acc_rep_subtitle")}</p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("acc_period_filter")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("acc_date_from")}</Label>
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("acc_date_to")}</Label>
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-11" />
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-2 h-9 px-2 text-xs" onClick={() => setRange(defaultAuditDateRange())}>
          {t("acc_reset_period")}
        </Button>

        {summary ? (
          <div className="mt-6 space-y-3 border-t border-border/60 pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("acc_rep_preview")}</p>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-4 tabular-nums">
                <span className="text-muted-foreground">{t("acc_card_payments_in")}</span>
                <span className="font-medium">{formatFcfa(summary.totalPaymentsIn)}</span>
              </li>
              <li className="flex justify-between gap-4 tabular-nums">
                <span className="text-muted-foreground">{t("acc_card_manager_expenses")}</span>
                <span className="font-medium">{formatFcfa(summary.totalManagerExpenses)}</span>
              </li>
              <li className="flex justify-between gap-4 tabular-nums">
                <span className="text-muted-foreground">{t("acc_card_extraordinary")}</span>
                <span className="font-medium">{formatFcfa(summary.totalExtraordinaryExpenses)}</span>
              </li>
              <li className="flex justify-between gap-4 border-t border-border/50 pt-2 tabular-nums">
                <span className="font-medium">{t("acc_card_net")}</span>
                <span className="font-semibold">{formatFcfa(summary.theoreticalNetBalance)}</span>
              </li>
            </ul>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="h-12 flex-1 rounded-xl text-base" disabled={!summary || busy !== null} onClick={() => void downloadCsv()}>
          {busy === "csv" ? t("acc_exporting") : t("acc_export_csv")}
        </Button>
        <Button
          variant="secondary"
          className="h-12 flex-1 rounded-xl text-base"
          disabled={!summary || busy !== null}
          onClick={() => void downloadPdf()}
        >
          {busy === "pdf" ? t("acc_exporting") : t("acc_export_pdf")}
        </Button>
      </div>
    </div>
  )
}
