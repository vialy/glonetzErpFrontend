"use client"

import { accountingAuditService } from "@/domains/accounting"
import type { AuditDateRange } from "@/domains/accounting/types"
import { resolveLearnerDue } from "@/domains/learners/learner-balance"
import { learnersService } from "@/domains/learners/service"
import { staffMembersService } from "@/domains/staff/service"
import { isApiDataProvider } from "@/lib/data-provider"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"
import { drawPdfTable, type PdfTableColumn } from "@/lib/pdf-table"
import {
  getAdminClasses,
  getAdminLearners,
  getAdminPayments,
  getAdminUsers,
  type AdminPaymentItem,
} from "@/services/admin-mock.service"
import { fetchStaffExpenses } from "@/services/staff-expenses.service"
import { fetchStaffPayments } from "@/services/staff-payments.service"
import { fetchClassPaymentSummary } from "@/services/scholarships.service"
import type { ManagerExpenseRecord } from "@/domains/manager-wallet/types"

export type ClassLearnerReportRow = {
  learnerId: string
  fullName: string
  phone: string
  due: number
  paid: number
  remaining: number
}

export type ClassLearnerReport = {
  classId: string
  className: string
  generatedAt: string
  learners: ClassLearnerReportRow[]
  totals: { due: number; paid: number; remaining: number }
}

export type ChargesReportRow = {
  id: string
  kind: "manager" | "extraordinary"
  spentAt: string
  label: string
  managerName?: string
  amount: number
  comment?: string
}

export type ChargesReport = {
  from: string
  to: string
  generatedAt: string
  rows: ChargesReportRow[]
  totals: {
    manager: number
    extraordinary: number
    combined: number
    paymentsIn: number
    netBalance: number
  }
}

export type PeriodFinancialSummary = {
  totalPaymentsIn: number
  totalManagerExpenses: number
  totalExtraordinaryExpenses: number
  theoreticalNetBalance: number
}

function csvEscape(value: string | number): string {
  const s = String(value)
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function sumPaidByLearner(payments: AdminPaymentItem[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const payment of payments) {
    const learnerId = payment.learnerId
    if (!learnerId) continue
    map.set(learnerId, (map.get(learnerId) ?? 0) + payment.amount)
  }
  return map
}

async function resolveLearnerBalances(
  learnerId: string,
  classId: string,
  fallbackDue: number,
  fallbackPaid: number,
): Promise<{ due: number; paid: number; remaining: number }> {
  if (isApiDataProvider()) {
    const summary = await fetchClassPaymentSummary(learnerId, classId)
    if (summary) {
      return {
        due: summary.expected,
        paid: summary.paid,
        remaining: summary.remaining,
      }
    }
  }
  const due = fallbackDue
  const paid = fallbackPaid
  return { due, paid, remaining: Math.max(0, due - paid) }
}

async function fetchManagerNameMap(): Promise<Record<string, string>> {
  if (!isApiDataProvider()) {
    const map: Record<string, string> = {}
    for (const user of getAdminUsers()) {
      if (user.role === "manager") map[user.id] = user.fullName
    }
    return map
  }
  const staff = await staffMembersService.list()
  const map: Record<string, string> = {}
  for (const member of staff) {
    if (member.role === "manager") map[member.id] = member.fullName
  }
  return map
}

export async function buildClassLearnerReport(classId: string): Promise<ClassLearnerReport | null> {
  const classes = isApiDataProvider()
    ? (await import("@/domains/classes/service")).classesService.list().catch(() => [])
    : Promise.resolve(getAdminClasses())
  const classList = await classes
  const cls = classList.find((c) => c.id === classId)
  if (!cls) return null

  const learners = isApiDataProvider()
    ? await learnersService.list({ classId })
    : getAdminLearners().filter((l) => l.classId === classId)

  const allPayments = isApiDataProvider()
    ? await fetchStaffPayments({ classId })
    : getAdminPayments().filter((p) => p.classId === classId)

  const paidByLearner = sumPaidByLearner(allPayments)

  const rows: ClassLearnerReportRow[] = []
  for (const learner of learners) {
    const paidFromPayments = paidByLearner.get(learner.id) ?? 0
    const fallbackDue = resolveLearnerDue(
      { classId: learner.classId, due: learner.due, paid: learner.paid },
      classList,
    )
    const fallbackPaid = isApiDataProvider() ? paidFromPayments : learner.paid || paidFromPayments
    const balances = await resolveLearnerBalances(learner.id, classId, fallbackDue, fallbackPaid)

    rows.push({
      learnerId: learner.id,
      fullName: learner.fullName,
      phone: learner.phone,
      due: balances.due,
      paid: balances.paid,
      remaining: balances.remaining,
    })
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }))

  const totals = rows.reduce(
    (acc, row) => ({
      due: acc.due + row.due,
      paid: acc.paid + row.paid,
      remaining: acc.remaining + row.remaining,
    }),
    { due: 0, paid: 0, remaining: 0 },
  )

  return {
    classId,
    className: cls.name,
    generatedAt: new Date().toISOString(),
    learners: rows,
    totals,
  }
}

function inDateRange(isoDate: string, range: AuditDateRange): boolean {
  const d = isoDate.slice(0, 10)
  return d >= range.from && d <= range.to
}

function sumPaymentsInRange(payments: AdminPaymentItem[], range: AuditDateRange): number {
  return payments
    .filter((p) => inDateRange(p.createdAt, range))
    .reduce((sum, p) => sum + p.amount, 0)
}

function classifyExpenseKind(expense: ManagerExpenseRecord): "manager" | "extraordinary" {
  if (expense.accountType === "staff") return "manager"
  if (expense.accountType === "company") return "extraordinary"
  return expense.managerId ? "manager" : "extraordinary"
}

function finalizeChargesTotals(rows: ChargesReportRow[], paymentsIn: number) {
  let manager = 0
  let extraordinary = 0
  for (const row of rows) {
    if (row.kind === "manager") manager += row.amount
    else extraordinary += row.amount
  }
  const combined = manager + extraordinary
  return {
    manager,
    extraordinary,
    combined,
    paymentsIn,
    netBalance: paymentsIn - combined,
  }
}

export async function buildChargesReport(range: AuditDateRange): Promise<ChargesReport> {
  if (!isApiDataProvider()) {
    const manager = accountingAuditService.getManagerExpensesInRange(range)
    const extra = accountingAuditService.getExtraordinaryInRange(range)
    const rows: ChargesReportRow[] = [
      ...manager.map((m) => ({
        id: m.id,
        kind: "manager" as const,
        spentAt: m.spentAt.slice(0, 10),
        label: m.category,
        managerName: m.managerLabel,
        amount: m.amount,
        comment: m.comment,
      })),
      ...extra.map((e) => ({
        id: e.id,
        kind: "extraordinary" as const,
        spentAt: e.spentAt.slice(0, 10),
        label: e.description,
        amount: e.amount,
        comment: e.category,
      })),
    ].sort((a, b) => b.spentAt.localeCompare(a.spentAt))

    const totalManager = manager.reduce((s, m) => s + m.amount, 0)
    const totalExtra = extra.reduce((s, e) => s + e.amount, 0)
    const paymentsIn = sumPaymentsInRange(getAdminPayments(), range)
    return {
      from: range.from,
      to: range.to,
      generatedAt: new Date().toISOString(),
      rows,
      totals: finalizeChargesTotals(rows, paymentsIn),
    }
  }

  const [allExpenses, payments, managerNames] = await Promise.all([
    fetchStaffExpenses({ from: range.from, to: range.to }),
    fetchStaffPayments(),
    fetchManagerNameMap(),
  ])

  const paymentsIn = sumPaymentsInRange(payments, range)

  const mapExpense = (e: ManagerExpenseRecord, kind: "manager" | "extraordinary"): ChargesReportRow => ({
    id: e.id,
    kind,
    spentAt: e.spentAt.slice(0, 10),
    label: e.categoryLabel,
    managerName: e.managerId ? managerNames[e.managerId] : undefined,
    amount: e.amount,
    comment: e.comment,
  })

  const rows = allExpenses
    .map((e) => mapExpense(e, classifyExpenseKind(e)))
    .sort((a, b) => b.spentAt.localeCompare(a.spentAt))

  return {
    from: range.from,
    to: range.to,
    generatedAt: new Date().toISOString(),
    rows,
    totals: finalizeChargesTotals(rows, paymentsIn),
  }
}

export async function buildPeriodFinancialSummary(range: AuditDateRange): Promise<PeriodFinancialSummary> {
  const report = await buildChargesReport(range)
  return {
    totalPaymentsIn: report.totals.paymentsIn,
    totalManagerExpenses: report.totals.manager,
    totalExtraordinaryExpenses: report.totals.extraordinary,
    theoreticalNetBalance: report.totals.netBalance,
  }
}

export function buildClassReportCsv(report: ClassLearnerReport): string {
  const lines: string[] = []
  lines.push(
    [
      csvEscape("Classe"),
      csvEscape("Apprenant"),
      csvEscape("Telephone"),
      csvEscape("ID apprenant"),
      csvEscape("Montant du (FCFA)"),
      csvEscape("Total paye (FCFA)"),
      csvEscape("Reste a payer (FCFA)"),
    ].join(","),
  )

  for (const learner of report.learners) {
    lines.push(
      [
        csvEscape(report.className),
        csvEscape(learner.fullName),
        csvEscape(learner.phone),
        csvEscape(learner.learnerId),
        csvEscape(learner.due),
        csvEscape(learner.paid),
        csvEscape(learner.remaining),
      ].join(","),
    )
  }

  lines.push("")
  lines.push(
    [
      csvEscape("TOTAUX"),
      "",
      "",
      "",
      csvEscape(report.totals.due),
      csvEscape(report.totals.paid),
      csvEscape(report.totals.remaining),
    ].join(","),
  )
  return lines.join("\n")
}

export function buildChargesReportCsv(report: ChargesReport): string {
  const lines: string[] = []
  lines.push(
    [
      csvEscape("Type"),
      csvEscape("Date"),
      csvEscape("Libelle"),
      csvEscape("Manager"),
      csvEscape("Commentaire"),
      csvEscape("Montant (FCFA)"),
    ].join(","),
  )

  for (const row of report.rows) {
    lines.push(
      [
        csvEscape(row.kind === "manager" ? "Depense manager" : "Depense extraordinaire"),
        csvEscape(row.spentAt),
        csvEscape(row.label),
        csvEscape(row.managerName ?? ""),
        csvEscape(row.comment ?? ""),
        csvEscape(row.amount),
      ].join(","),
    )
  }

  lines.push("")
  lines.push([csvEscape("Periode"), csvEscape(`${report.from} -> ${report.to}`), "", "", "", ""].join(","))
  lines.push([csvEscape("Total manager"), "", "", "", "", csvEscape(report.totals.manager)].join(","))
  lines.push([csvEscape("Total extraordinaire"), "", "", "", "", csvEscape(report.totals.extraordinary)].join(","))
  lines.push([csvEscape("Total charges"), "", "", "", "", csvEscape(report.totals.combined)].join(","))
  lines.push([csvEscape("Encaissements periode"), "", "", "", "", csvEscape(report.totals.paymentsIn)].join(","))
  lines.push([csvEscape("Solde net periode"), "", "", "", "", csvEscape(report.totals.netBalance)].join(","))
  return lines.join("\n")
}

export async function downloadClassReportPdf(report: ClassLearnerReport) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  let y = 16

  doc.setFillColor(192, 38, 211)
  doc.rect(0, 0, pageWidth, 28, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text(sanitizeTextForPdf("Glonetz — Rapport par classe"), left, 14)
  doc.setFontSize(10)
  doc.text(sanitizeTextForPdf(`${report.className} (${report.classId})`), left, 21)

  y = 36
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(9)
  doc.text(sanitizeTextForPdf(`Genere le ${report.generatedAt.slice(0, 10)}`), left, y)
  doc.text(
    sanitizeTextForPdf(`${report.learners.length} apprenant(s)`),
    pageWidth - left,
    y,
    { align: "right" },
  )
  y += 8

  const columns: PdfTableColumn[] = [
    { header: "Apprenant", width: 52, align: "left" },
    { header: "Telephone", width: 30, align: "left" },
    { header: "Montant du", width: 32, align: "right" },
    { header: "Total paye", width: 32, align: "right" },
    { header: "Reste a payer", width: 34, align: "right" },
  ]

  const rows = report.learners.map((learner) => [
    learner.fullName,
    learner.phone,
    formatFcfaForPdf(learner.due),
    formatFcfaForPdf(learner.paid),
    formatFcfaForPdf(learner.remaining),
  ])

  y = drawPdfTable(doc, columns, rows, {
    startY: y,
    headerFill: [79, 70, 229],
    headerText: [255, 255, 255],
    rowFillEven: [238, 242, 255],
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (_row, colIndex) => {
      if (colIndex === 3) return [21, 128, 61]
      if (colIndex === 4) return [220, 38, 38]
      return undefined
    },
    footerRow: [
      "TOTAUX",
      "",
      formatFcfaForPdf(report.totals.due),
      formatFcfaForPdf(report.totals.paid),
      formatFcfaForPdf(report.totals.remaining),
    ],
    footerFill: [199, 210, 254],
    footerText: [49, 46, 129],
  })

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    sanitizeTextForPdf("Document genere depuis l'administration Glonetz."),
    left,
    Math.min(y + 8, doc.internal.pageSize.getHeight() - 10),
  )

  doc.save(`rapport-classe-${report.classId}.pdf`)
}

export async function downloadChargesReportPdf(report: ChargesReport) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  let y = 16

  doc.setFillColor(234, 88, 12)
  doc.rect(0, 0, pageWidth, 28, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text(sanitizeTextForPdf("Glonetz — Rapport des charges"), left, 14)
  doc.setFontSize(10)
  doc.text(sanitizeTextForPdf(`Periode : ${report.from} au ${report.to}`), left, 21)

  y = 36
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(9)
  doc.text(sanitizeTextForPdf(`Genere le ${report.generatedAt.slice(0, 10)}`), left, y)
  doc.text(
    sanitizeTextForPdf(`${report.rows.length} charge(s)`),
    pageWidth - left,
    y,
    { align: "right" },
  )
  y += 8

  const columns: PdfTableColumn[] = [
    { header: "Type", width: 28, align: "left" },
    { header: "Date", width: 24, align: "left" },
    { header: "Libelle", width: 58, align: "left" },
    { header: "Manager", width: 38, align: "left" },
    { header: "Montant", width: 32, align: "right" },
  ]

  const typeLabel = (kind: ChargesReportRow["kind"]) =>
    kind === "manager" ? "Manager" : "Extraordinaire"

  const rows = report.rows.map((row) => [
    typeLabel(row.kind),
    row.spentAt,
    row.label,
    row.managerName ?? "—",
    formatFcfaForPdf(row.amount),
  ])

  y = drawPdfTable(doc, columns, rows, {
    startY: y,
    headerFill: [234, 88, 12],
    headerText: [255, 255, 255],
    rowFillEven: [255, 247, 237],
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (rowIndex, colIndex) => {
      const kind = report.rows[rowIndex]?.kind
      if (colIndex === 0) {
        return kind === "manager" ? [37, 99, 235] : [194, 65, 12]
      }
      if (colIndex === 4) return [220, 38, 38]
      return undefined
    },
  })

  y += 6
  const summaryColumns: PdfTableColumn[] = [
    { header: "Synthese periode", width: 118, align: "left" },
    { header: "Montant", width: 62, align: "right" },
  ]
  const summaryRows = [
    ["Encaissements", formatFcfaForPdf(report.totals.paymentsIn)],
    ["Total depenses manager", formatFcfaForPdf(report.totals.manager)],
    ["Total depenses extraordinaires", formatFcfaForPdf(report.totals.extraordinary)],
    ["Total charges", formatFcfaForPdf(report.totals.combined)],
  ]

  y = drawPdfTable(doc, summaryColumns, summaryRows, {
    startY: y,
    x: left,
    headerFill: [251, 146, 60],
    headerText: [255, 255, 255],
    rowFillEven: [255, 251, 235],
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (_row, colIndex, context) => {
      if (colIndex !== 1) return undefined
      if (context === "footer") {
        return report.totals.netBalance >= 0 ? [21, 128, 61] : [220, 38, 38]
      }
      if (_row === 0) return [21, 128, 61]
      return [220, 38, 38]
    },
    footerRow: ["Solde net (encaissements - charges)", formatFcfaForPdf(report.totals.netBalance)],
    footerFill: [254, 215, 170],
    footerText: [124, 45, 18],
  })

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    sanitizeTextForPdf("Document genere depuis l'administration Glonetz."),
    left,
    Math.min(y + 8, doc.internal.pageSize.getHeight() - 10),
  )

  doc.save(`rapport-charges-${report.from}-${report.to}.pdf`)
}
