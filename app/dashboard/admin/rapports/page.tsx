"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import { FileDown, FileText, Table2 } from "lucide-react"
import { accountingAuditService } from "@/domains/accounting"
import type { PaymentMethod } from "@/domains/payments/types"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"
import { managerFilterToAuditDateRange } from "@/lib/manager-period-range"
import type { ManagerPeriodFilterValue } from "@/lib/manager-period-range"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"
import { toast } from "@/components/ui/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"

function methodLabel(m: PaymentMethod): string {
  switch (m) {
    case "mtn_momo":
      return "MTN MoMo"
    case "orange_money":
      return "Orange Money"
    case "cash":
      return "Especes"
    default:
      return m
  }
}

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
  return s
}

const defaultPeriodFilter = (): ManagerPeriodFilterValue => ({
  preset: "last_30",
  customFrom: "",
  customTo: "",
})

type ReportKind = "payments" | "charges" | "bilan"

export default function AdminReportsPage() {
  const { t } = useLocale()
  const [periodFilter, setPeriodFilter] = useState<ManagerPeriodFilterValue>(defaultPeriodFilter)
  const [busy, setBusy] = useState<{ kind: ReportKind; type: "pdf" | "excel" } | null>(null)

  const auditRange = useMemo(() => managerFilterToAuditDateRange(periodFilter), [periodFilter])
  const summary = useMemo(() => (auditRange ? accountingAuditService.getSummary(auditRange) : null), [auditRange])

  const periodSummary =
    auditRange ? (
      <span>
        {auditRange.from} → {auditRange.to}
      </span>
    ) : null

  const buildCsv = useCallback(
    (kind: ReportKind) => {
      if (!auditRange || !summary) return ""
      const lines: string[] = []
      if (kind === "bilan") {
        lines.push(
          [csvEscape("Indicateur"), csvEscape("Montant XOF")].join(","),
          [csvEscape("Encaissements"), csvEscape(String(summary.totalPaymentsIn))].join(","),
          [csvEscape("Depenses manager"), csvEscape(String(summary.totalManagerExpenses))].join(","),
          [csvEscape("Depenses extraordinaires"), csvEscape(String(summary.totalExtraordinaryExpenses))].join(","),
          [csvEscape("Solde net theorique"), csvEscape(String(summary.theoreticalNetBalance))].join(","),
        )
        return [`Periode,${auditRange.from},${auditRange.to}`, ...lines].join("\n")
      }
      if (kind === "payments") {
        const payments = accountingAuditService.getPaymentsInRange(auditRange)
        lines.push(
          [csvEscape("ID"), csvEscape("Date"), csvEscape("Apprenant"), csvEscape("Classe"), csvEscape("Methode"), csvEscape("Montant XOF")].join(
            ",",
          ),
        )
        for (const p of payments) {
          lines.push(
            [
              csvEscape(p.id),
              csvEscape(p.recordedAt.slice(0, 10)),
              csvEscape(p.studentName),
              csvEscape(p.className),
              csvEscape(methodLabel(p.paymentMethod)),
              csvEscape(String(p.amount)),
            ].join(","),
          )
        }
        return [`Rapport paiements par classe — ${auditRange.from} au ${auditRange.to}`, "", ...lines].join("\n")
      }
      const manager = accountingAuditService.getManagerExpensesInRange(auditRange)
      const extra = accountingAuditService.getExtraordinaryInRange(auditRange)
      lines.push([csvEscape("Type"), csvEscape("ID"), csvEscape("Date"), csvEscape("Detail"), csvEscape("Montant XOF")].join(","))
      for (const m of manager) {
        lines.push(
          [
            csvEscape("Manager"),
            csvEscape(m.id),
            csvEscape(m.spentAt.slice(0, 10)),
            csvEscape(`${m.category} | ${m.managerLabel}${m.comment ? ` | ${m.comment}` : ""}`),
            csvEscape(String(m.amount)),
          ].join(","),
        )
      }
      for (const e of extra) {
        lines.push(
          [
            csvEscape("Extraordinaire"),
            csvEscape(e.id),
            csvEscape(e.spentAt.slice(0, 10)),
            csvEscape(`${e.description}${e.category ? ` | ${e.category}` : ""}`),
            csvEscape(String(e.amount)),
          ].join(","),
        )
      }
      return [`Rapport des charges — ${auditRange.from} au ${auditRange.to}`, "", ...lines].join("\n")
    },
    [auditRange, summary],
  )

  const downloadExcel = useCallback(
    (kind: ReportKind, title: string) => {
      if (!auditRange) {
        toast({ title: t("adm_rep_need_period"), variant: "destructive" })
        return
      }
      setBusy({ kind, type: "excel" })
      try {
        const csv = buildCsv(kind)
        const slug = kind === "payments" ? "paiements-classes" : kind === "charges" ? "charges" : "bilan"
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `${slug}-${auditRange.from}_${auditRange.to}.csv`
        link.click()
        URL.revokeObjectURL(link.href)
        toast({ title: t("adm_rep_toast_export"), description: `${title} (CSV) — ${auditRange.from} au ${auditRange.to}` })
      } finally {
        setBusy(null)
      }
    },
    [auditRange, buildCsv, t],
  )

  const downloadPdf = useCallback(
    async (kind: ReportKind, title: string) => {
      if (!auditRange || !summary) {
        toast({ title: t("adm_rep_need_period"), variant: "destructive" })
        return
      }
      setBusy({ kind, type: "pdf" })
      try {
        const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
        const doc = new jsPDF({ unit: "mm", format: "a4" })
        const left = 14
        let y = 16
        doc.setFontSize(15)
        doc.setTextColor(30, 41, 59)
        doc.text(sanitizeTextForPdf(`Glonetz — ${title}`), left, y)
        y += 8
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text(sanitizeTextForPdf(`Periode : ${auditRange.from} au ${auditRange.to}`), left, y)
        y += 10
        doc.setTextColor(15, 23, 42)

        if (kind === "bilan") {
          const row = (label: string, value: string) => {
            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            doc.text(sanitizeTextForPdf(label), left, y)
            doc.setTextColor(15, 23, 42)
            doc.text(sanitizeTextForPdf(value), left + 88, y)
            y += 7
          }
          row("Encaissements", formatFcfaForPdf(summary.totalPaymentsIn))
          row("Depenses manager", formatFcfaForPdf(summary.totalManagerExpenses))
          row("Depenses extraordinaires", formatFcfaForPdf(summary.totalExtraordinaryExpenses))
          row("Solde net theorique", formatFcfaForPdf(summary.theoreticalNetBalance))
        } else if (kind === "payments") {
          const payments = accountingAuditService.getPaymentsInRange(auditRange)
          doc.setFontSize(9)
          let rowY = y
          for (const p of payments) {
            if (rowY > 270) {
              doc.addPage()
              rowY = 16
            }
            const line = `${p.recordedAt.slice(0, 10)} | ${p.className} | ${p.studentName} | ${formatFcfaForPdf(p.amount)}`
            doc.text(sanitizeTextForPdf(line), left, rowY)
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            doc.text(sanitizeTextForPdf(`${methodLabel(p.paymentMethod)} ${p.externalReference ? `· ${p.externalReference}` : ""}`), left, rowY + 4)
            doc.setFontSize(9)
            doc.setTextColor(15, 23, 42)
            rowY += 10
          }
          if (payments.length === 0) {
            doc.text(sanitizeTextForPdf("Aucun encaissement sur cette periode."), left, rowY)
          }
        } else {
          const manager = accountingAuditService.getManagerExpensesInRange(auditRange)
          const extra = accountingAuditService.getExtraordinaryInRange(auditRange)
          doc.setFontSize(10)
          doc.text(sanitizeTextForPdf("Depenses manager"), left, y)
          y += 6
          doc.setFontSize(9)
          for (const m of manager) {
            if (y > 270) {
              doc.addPage()
              y = 16
            }
            doc.text(
              sanitizeTextForPdf(`${m.spentAt.slice(0, 10)} | ${m.category} | ${formatFcfaForPdf(m.amount)}`),
              left,
              y,
            )
            y += 6
          }
          y += 4
          doc.setFontSize(10)
          doc.text(sanitizeTextForPdf("Depenses extraordinaires"), left, y)
          y += 6
          doc.setFontSize(9)
          for (const e of extra) {
            if (y > 270) {
              doc.addPage()
              y = 16
            }
            doc.text(sanitizeTextForPdf(`${e.spentAt.slice(0, 10)} | ${e.description} | ${formatFcfaForPdf(e.amount)}`), left, y)
            y += 6
          }
        }

        y = Math.min(y + 8, 280)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(sanitizeTextForPdf("Document genere depuis l’administration — donnees indicatives."), left, y)

        const slug = kind === "payments" ? "paiements-classes" : kind === "charges" ? "charges" : "bilan"
        doc.save(`${slug}-${auditRange.from}-${auditRange.to}.pdf`)
        toast({ title: t("adm_rep_pdf"), description: `${title} — ${auditRange.from} au ${auditRange.to}` })
      } finally {
        setBusy(null)
      }
    },
    [auditRange, summary, t],
  )

  const cards: {
    title: string
    desc: string
    icon: ReactNode
    kind: ReportKind
  }[] = useMemo(
    () => [
      {
        title: t("adm_rep_card_pay_title"),
        desc: t("adm_rep_card_pay_desc"),
        icon: <Table2 className="size-4" />,
        kind: "payments" as const,
      },
      {
        title: t("adm_rep_card_charges_title"),
        desc: t("adm_rep_card_charges_desc"),
        icon: <FileText className="size-4" />,
        kind: "charges" as const,
      },
      {
        title: t("adm_rep_card_bilan_title"),
        desc: t("adm_rep_card_bilan_desc"),
        icon: <FileDown className="size-4" />,
        kind: "bilan" as const,
      },
    ],
    [t],
  )

  const exportDisabled = !auditRange || busy !== null

  const isBusy = (kind: ReportKind, type: "pdf" | "excel") => busy?.kind === kind && busy?.type === type

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader title={t("adm_rep_page_title")} subtitle={t("adm_rep_page_sub")} gradientClassName="from-fuchsia-600 to-indigo-600" />

      <div className="mt-6">
        <ManagerPeriodFilter
          value={periodFilter}
          onChange={setPeriodFilter}
          hint={t("adm_rep_filter_hint")}
          summary={periodSummary}
        />
      </div>

      {!auditRange ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{t("adm_rep_need_period")}</p>
      ) : null}

      {summary && auditRange ? (
        <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_rep_preview_title")}</p>
          <ul className="mt-3 space-y-2 text-sm">
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
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.kind} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">{c.icon}</div>
            <p className="mt-3 text-sm font-semibold">{c.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exportDisabled}
                onClick={() => void downloadPdf(c.kind, c.title)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isBusy(c.kind, "pdf") ? t("acc_exporting") : t("adm_rep_pdf")}
              </button>
              <button
                type="button"
                disabled={exportDisabled}
                onClick={() => downloadExcel(c.kind, c.title)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {isBusy(c.kind, "excel") ? t("acc_exporting") : t("adm_rep_excel")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 text-sm text-muted-foreground">{t("adm_rep_footer_note")}</div>
    </div>
  )
}
