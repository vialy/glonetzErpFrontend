"use client"

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
  type AdminPaymentItem,
} from "@/services/admin-mock.service"
import { fetchStaffPayments } from "@/services/staff-payments.service"
import { fetchClassPaymentSummary } from "@/services/scholarships.service"
import {
  fetchAccountStatement,
  fetchAccountStatementById,
  fetchAllAccounts,
  type StatementEntry,
} from "@/services/staff-accounts.service"

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

/** Mouvements du compte principal (hors transferts internes). */
export type CompanyMovementKind =
  | "payment_in"
  | "extraordinary_in"
  | "extraordinary_out"
  | "manager_allocation"

export type CompanyMovementRow = {
  id: string
  kind: CompanyMovementKind
  direction: "in" | "out"
  date: string
  label: string
  amount: number
}

export type CompanyAccountReport = {
  from: string
  to: string
  generatedAt: string
  accountName: string
  accountBalance: number
  rows: CompanyMovementRow[]
  totals: {
    paymentsIn: number
    extraordinaryIn: number
    totalIn: number
    extraordinaryOut: number
    managerAllocations: number
    totalOut: number
    periodBalance: number
  }
}

/** Rapport budget manager : allocations reçues + dépenses. */
export type ManagerMovementKind = "budget_in" | "expense_out"

export type ManagerMovementRow = {
  id: string
  kind: ManagerMovementKind
  direction: "in" | "out"
  date: string
  label: string
  amount: number
}

export type ManagerAccountReport = {
  from: string
  to: string
  generatedAt: string
  managerId: string
  managerName: string
  accountName: string
  accountBalance: number
  rows: ManagerMovementRow[]
  totals: {
    budgetsIn: number
    expensesOut: number
    periodBalance: number
  }
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

function statementRangeQuery(range: AuditDateRange): { from: string; to: string } {
  return {
    from: `${range.from}T00:00:00.000`,
    to: `${range.to}T23:59:59.999`,
  }
}

function entryAmount(entry: StatementEntry): number {
  return entry.totalAmount || entry.amount || 0
}

/** Crédit technique après échec de virement / payout — hors rapport économique. */
function isCancellationEntry(entry: StatementEntry): boolean {
  const desc = (entry.description || "").toLowerCase()
  if (!desc.includes("annulation")) return false
  return (
    desc.includes("virement") ||
    desc.includes("echoue") ||
    desc.includes("échoué") ||
    desc.includes("echoué") ||
    Boolean(entry.withdrawalFriendlyId)
  )
}

/** IDs de retraits dont le virement a échoué (à exclure avec leur annulation). */
function cancelledWithdrawalIds(entries: StatementEntry[]): Set<string> {
  const ids = new Set<string>()
  for (const entry of entries) {
    if (!isCancellationEntry(entry)) continue
    if (entry.withdrawalFriendlyId) ids.add(entry.withdrawalFriendlyId)
  }
  return ids
}

function classifyCompanyEntry(
  entry: StatementEntry,
  staffAccountIds: Set<string>,
  treasuryAccountIds: Set<string>,
  cancelledWithdrawals: Set<string>,
): CompanyMovementRow | null {
  // Annulations et retraits annulés : mouvements techniques, pas des charges/revenus.
  if (isCancellationEntry(entry)) return null
  if (entry.withdrawalFriendlyId && cancelledWithdrawals.has(entry.withdrawalFriendlyId)) {
    return null
  }

  const amount = entryAmount(entry)
  if (amount <= 0) return null
  const date = entry.createdAt.slice(0, 10)
  const label = entry.description?.trim() || entry.categoryLabel?.trim() || "—"
  const counterparty = entry.counterpartyAccountId

  if (entry.source === "transfer") {
    // Transferts company ↔ virtual = mouvements internes (hors rapport).
    if (!counterparty || treasuryAccountIds.has(counterparty)) return null
    if (staffAccountIds.has(counterparty)) {
      if (entry.direction !== "out") return null
      return {
        id: entry.id,
        kind: "manager_allocation",
        direction: "out",
        date,
        label: label || "Allocation manager",
        amount,
      }
    }
    return null
  }

  if (entry.source === "payment" && entry.direction === "in") {
    return { id: entry.id, kind: "payment_in", direction: "in", date, label, amount }
  }

  if (entry.source === "adjustment" && entry.direction === "in") {
    return { id: entry.id, kind: "extraordinary_in", direction: "in", date, label, amount }
  }

  if (
    entry.direction === "out" &&
    (entry.source === "expense" || entry.source === "adjustment" || entry.source === "withdrawal")
  ) {
    return { id: entry.id, kind: "extraordinary_out", direction: "out", date, label, amount }
  }

  return null
}

function finalizeCompanyTotals(rows: CompanyMovementRow[]) {
  let paymentsIn = 0
  let extraordinaryIn = 0
  let extraordinaryOut = 0
  let managerAllocations = 0
  for (const row of rows) {
    if (row.kind === "payment_in") paymentsIn += row.amount
    else if (row.kind === "extraordinary_in") extraordinaryIn += row.amount
    else if (row.kind === "extraordinary_out") extraordinaryOut += row.amount
    else if (row.kind === "manager_allocation") managerAllocations += row.amount
  }
  const totalIn = paymentsIn + extraordinaryIn
  const totalOut = extraordinaryOut + managerAllocations
  return {
    paymentsIn,
    extraordinaryIn,
    totalIn,
    extraordinaryOut,
    managerAllocations,
    totalOut,
    periodBalance: totalIn - totalOut,
  }
}

export async function buildCompanyAccountReport(range: AuditDateRange): Promise<CompanyAccountReport> {
  if (!isApiDataProvider()) {
    return {
      from: range.from,
      to: range.to,
      generatedAt: new Date().toISOString(),
      accountName: "Compte principal",
      accountBalance: 0,
      rows: [],
      totals: finalizeCompanyTotals([]),
    }
  }

  const [allAccounts, statement] = await Promise.all([
    fetchAllAccounts(),
    fetchAccountStatement(statementRangeQuery(range)),
  ])

  const staffAccountIds = new Set(
    allAccounts.filter((a) => a.type === "staff").map((a) => a.accountId),
  )
  const treasuryAccountIds = new Set(
    allAccounts.filter((a) => a.type === "company" || a.type === "virtual").map((a) => a.accountId),
  )
  const cancelledWithdrawals = cancelledWithdrawalIds(statement.entries)

  const rows = statement.entries
    .map((entry) =>
      classifyCompanyEntry(entry, staffAccountIds, treasuryAccountIds, cancelledWithdrawals),
    )
    .filter((row): row is CompanyMovementRow => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  return {
    from: range.from,
    to: range.to,
    generatedAt: new Date().toISOString(),
    accountName: statement.account?.name || "Compte principal",
    accountBalance: statement.account?.balance ?? 0,
    rows,
    totals: finalizeCompanyTotals(rows),
  }
}

function classifyManagerEntry(entry: StatementEntry): ManagerMovementRow | null {
  const amount = entryAmount(entry)
  if (amount <= 0) return null
  const date = entry.createdAt.slice(0, 10)
  const label = entry.description?.trim() || entry.categoryLabel?.trim() || "—"

  if (entry.source === "transfer" && entry.direction === "in") {
    return { id: entry.id, kind: "budget_in", direction: "in", date, label: label || "Budget recu", amount }
  }

  if (entry.source === "expense" && entry.direction === "out") {
    return { id: entry.id, kind: "expense_out", direction: "out", date, label, amount }
  }

  return null
}

function finalizeManagerTotals(rows: ManagerMovementRow[]) {
  let budgetsIn = 0
  let expensesOut = 0
  for (const row of rows) {
    if (row.kind === "budget_in") budgetsIn += row.amount
    else expensesOut += row.amount
  }
  return {
    budgetsIn,
    expensesOut,
    periodBalance: budgetsIn - expensesOut,
  }
}

export async function buildManagerAccountReport(
  managerId: string,
  range: AuditDateRange,
): Promise<ManagerAccountReport | null> {
  const managers = isApiDataProvider() ? await staffMembersService.list() : []
  const manager = managers.find((m) => m.id === managerId && m.role === "manager")
  if (!manager) return null

  if (!isApiDataProvider()) {
    return {
      from: range.from,
      to: range.to,
      generatedAt: new Date().toISOString(),
      managerId: manager.id,
      managerName: manager.fullName,
      accountName: `Compte ${manager.fullName}`,
      accountBalance: 0,
      rows: [],
      totals: finalizeManagerTotals([]),
    }
  }

  const allAccounts = await fetchAllAccounts()
  const managerAccount = allAccounts.find(
    (a) => a.type === "staff" && a.owner?.staffId === managerId && a.isActive,
  )
  if (!managerAccount) {
    return {
      from: range.from,
      to: range.to,
      generatedAt: new Date().toISOString(),
      managerId: manager.id,
      managerName: manager.fullName,
      accountName: `Compte ${manager.fullName}`,
      accountBalance: 0,
      rows: [],
      totals: finalizeManagerTotals([]),
    }
  }

  const statement = await fetchAccountStatementById(
    managerAccount.accountId,
    statementRangeQuery(range),
  )

  const rows = statement.entries
    .map(classifyManagerEntry)
    .filter((row): row is ManagerMovementRow => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  return {
    from: range.from,
    to: range.to,
    generatedAt: new Date().toISOString(),
    managerId: manager.id,
    managerName: manager.fullName,
    accountName: statement.account?.name || managerAccount.name,
    accountBalance: statement.account?.balance ?? managerAccount.balance,
    rows,
    totals: finalizeManagerTotals(rows),
  }
}

export function companyMovementKindLabel(kind: CompanyMovementKind): string {
  switch (kind) {
    case "payment_in":
      return "Paiement apprenant"
    case "extraordinary_in":
      return "Entree extraordinaire"
    case "extraordinary_out":
      return "Retrait extraordinaire"
    case "manager_allocation":
      return "Allocation manager"
  }
}

export function managerMovementKindLabel(kind: ManagerMovementKind): string {
  return kind === "budget_in" ? "Budget recu" : "Depense"
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

export function buildCompanyAccountReportCsv(report: CompanyAccountReport): string {
  const lines: string[] = []
  lines.push(
    [
      csvEscape("Sens"),
      csvEscape("Type"),
      csvEscape("Date"),
      csvEscape("Libelle"),
      csvEscape("Montant (FCFA)"),
    ].join(","),
  )

  for (const row of report.rows) {
    lines.push(
      [
        csvEscape(row.direction === "in" ? "Entree" : "Sortie"),
        csvEscape(companyMovementKindLabel(row.kind)),
        csvEscape(row.date),
        csvEscape(row.label),
        csvEscape(row.amount),
      ].join(","),
    )
  }

  lines.push("")
  lines.push([csvEscape("Periode"), csvEscape(`${report.from} -> ${report.to}`), "", "", ""].join(","))
  lines.push([csvEscape("Total paiements"), "", "", "", csvEscape(report.totals.paymentsIn)].join(","))
  lines.push([
    csvEscape("Total entrees extraordinaires"),
    "",
    "",
    "",
    csvEscape(report.totals.extraordinaryIn),
  ].join(","))
  lines.push([csvEscape("Total entrees"), "", "", "", csvEscape(report.totals.totalIn)].join(","))
  lines.push([
    csvEscape("Total retraits extraordinaires"),
    "",
    "",
    "",
    csvEscape(report.totals.extraordinaryOut),
  ].join(","))
  lines.push([
    csvEscape("Total allocations manager"),
    "",
    "",
    "",
    csvEscape(report.totals.managerAllocations),
  ].join(","))
  lines.push([csvEscape("Total sorties"), "", "", "", csvEscape(report.totals.totalOut)].join(","))
  lines.push([csvEscape("Solde periode"), "", "", "", csvEscape(report.totals.periodBalance)].join(","))
  lines.push([csvEscape("Solde compte actuel"), "", "", "", csvEscape(report.accountBalance)].join(","))
  return lines.join("\n")
}

export function buildManagerAccountReportCsv(report: ManagerAccountReport): string {
  const lines: string[] = []
  lines.push(
    [
      csvEscape("Sens"),
      csvEscape("Type"),
      csvEscape("Date"),
      csvEscape("Libelle"),
      csvEscape("Montant (FCFA)"),
    ].join(","),
  )

  for (const row of report.rows) {
    lines.push(
      [
        csvEscape(row.direction === "in" ? "Entree" : "Sortie"),
        csvEscape(managerMovementKindLabel(row.kind)),
        csvEscape(row.date),
        csvEscape(row.label),
        csvEscape(row.amount),
      ].join(","),
    )
  }

  lines.push("")
  lines.push([csvEscape("Manager"), csvEscape(report.managerName), "", "", ""].join(","))
  lines.push([csvEscape("Periode"), csvEscape(`${report.from} -> ${report.to}`), "", "", ""].join(","))
  lines.push([csvEscape("Total budgets recus"), "", "", "", csvEscape(report.totals.budgetsIn)].join(","))
  lines.push([csvEscape("Total depenses"), "", "", "", csvEscape(report.totals.expensesOut)].join(","))
  lines.push([csvEscape("Solde periode"), "", "", "", csvEscape(report.totals.periodBalance)].join(","))
  lines.push([csvEscape("Solde restant actuel"), "", "", "", csvEscape(report.accountBalance)].join(","))
  return lines.join("\n")
}

/** Couleurs marque Glonetz (extraites du logo : charcoal + bleu ciel). */
const GLONETZ_BRAND = {
  banner: [24, 32, 40] as [number, number, number], // #182028
  tableHeader: [24, 32, 40] as [number, number, number],
  summaryHeader: [40, 52, 64] as [number, number, number],
  accent: [160, 216, 248] as [number, number, number], // #A0D8F8
  rowEven: [236, 246, 253] as [number, number, number],
  footerFill: [160, 216, 248] as [number, number, number],
  footerText: [24, 32, 40] as [number, number, number],
}

export async function downloadClassReportPdf(report: ClassLearnerReport) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  let y = 16

  doc.setFillColor(...GLONETZ_BRAND.banner)
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
    headerFill: GLONETZ_BRAND.tableHeader,
    headerText: [255, 255, 255],
    rowFillEven: GLONETZ_BRAND.rowEven,
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
    footerFill: GLONETZ_BRAND.footerFill,
    footerText: GLONETZ_BRAND.footerText,
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

export async function downloadCompanyAccountReportPdf(report: CompanyAccountReport) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  let y = 16

  doc.setFillColor(...GLONETZ_BRAND.banner)
  doc.rect(0, 0, pageWidth, 28, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text(sanitizeTextForPdf("Glonetz — Compte principal"), left, 14)
  doc.setFontSize(10)
  doc.text(sanitizeTextForPdf(`Periode : ${report.from} au ${report.to}`), left, 21)

  y = 36
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(9)
  doc.text(
    sanitizeTextForPdf(`${report.accountName} — genere le ${report.generatedAt.slice(0, 10)}`),
    left,
    y,
  )
  doc.text(
    sanitizeTextForPdf(`${report.rows.length} mouvement(s)`),
    pageWidth - left,
    y,
    { align: "right" },
  )
  y += 8

  const columns: PdfTableColumn[] = [
    { header: "Sens", width: 18, align: "left" },
    { header: "Type", width: 42, align: "left" },
    { header: "Date", width: 24, align: "left" },
    { header: "Libelle", width: 62, align: "left" },
    { header: "Montant", width: 34, align: "right" },
  ]

  const rows = report.rows.map((row) => [
    row.direction === "in" ? "Entree" : "Sortie",
    companyMovementKindLabel(row.kind),
    row.date,
    row.label,
    formatFcfaForPdf(row.amount),
  ])

  y = drawPdfTable(doc, columns, rows, {
    startY: y,
    headerFill: GLONETZ_BRAND.tableHeader,
    headerText: [255, 255, 255],
    rowFillEven: GLONETZ_BRAND.rowEven,
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (rowIndex, colIndex) => {
      const direction = report.rows[rowIndex]?.direction
      if (colIndex === 0 || colIndex === 4) {
        return direction === "in" ? [21, 128, 61] : [220, 38, 38]
      }
      return undefined
    },
  })

  y += 6
  const summaryColumns: PdfTableColumn[] = [
    { header: "Synthese periode", width: 118, align: "left" },
    { header: "Montant", width: 62, align: "right" },
  ]
  const summaryRows = [
    ["Paiements apprenants", formatFcfaForPdf(report.totals.paymentsIn)],
    ["Entrees extraordinaires", formatFcfaForPdf(report.totals.extraordinaryIn)],
    ["Total entrees", formatFcfaForPdf(report.totals.totalIn)],
    ["Retraits extraordinaires", formatFcfaForPdf(report.totals.extraordinaryOut)],
    ["Allocations manager", formatFcfaForPdf(report.totals.managerAllocations)],
    ["Total sorties", formatFcfaForPdf(report.totals.totalOut)],
  ]

  y = drawPdfTable(doc, summaryColumns, summaryRows, {
    startY: y,
    x: left,
    headerFill: GLONETZ_BRAND.summaryHeader,
    headerText: [255, 255, 255],
    rowFillEven: GLONETZ_BRAND.rowEven,
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (_row, colIndex, context) => {
      if (colIndex !== 1) return undefined
      if (context === "footer") {
        return report.totals.periodBalance >= 0 ? [21, 128, 61] : [220, 38, 38]
      }
      if (_row === 0 || _row === 1 || _row === 2) return [21, 128, 61]
      return [220, 38, 38]
    },
    footerRow: ["Solde periode (entrees - sorties)", formatFcfaForPdf(report.totals.periodBalance)],
    footerFill: GLONETZ_BRAND.footerFill,
    footerText: GLONETZ_BRAND.footerText,
  })

  y += 4
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(
    sanitizeTextForPdf(`Solde actuel du compte : ${formatFcfaForPdf(report.accountBalance)}`),
    left,
    y,
  )
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    sanitizeTextForPdf("Les transferts internes (compte principal <-> sous-comptes) sont exclus."),
    left,
    Math.min(y, doc.internal.pageSize.getHeight() - 10),
  )

  doc.save(`rapport-compte-principal-${report.from}-${report.to}.pdf`)
}

export async function downloadManagerAccountReportPdf(report: ManagerAccountReport) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  let y = 16

  doc.setFillColor(...GLONETZ_BRAND.banner)
  doc.rect(0, 0, pageWidth, 28, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text(sanitizeTextForPdf("Glonetz — Rapport manager"), left, 14)
  doc.setFontSize(10)
  doc.text(sanitizeTextForPdf(`${report.managerName} — ${report.from} au ${report.to}`), left, 21)

  y = 36
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(9)
  doc.text(
    sanitizeTextForPdf(`${report.accountName} — genere le ${report.generatedAt.slice(0, 10)}`),
    left,
    y,
  )
  doc.text(
    sanitizeTextForPdf(`${report.rows.length} mouvement(s)`),
    pageWidth - left,
    y,
    { align: "right" },
  )
  y += 8

  const columns: PdfTableColumn[] = [
    { header: "Sens", width: 18, align: "left" },
    { header: "Type", width: 32, align: "left" },
    { header: "Date", width: 24, align: "left" },
    { header: "Libelle", width: 72, align: "left" },
    { header: "Montant", width: 34, align: "right" },
  ]

  const rows = report.rows.map((row) => [
    row.direction === "in" ? "Entree" : "Sortie",
    managerMovementKindLabel(row.kind),
    row.date,
    row.label,
    formatFcfaForPdf(row.amount),
  ])

  y = drawPdfTable(doc, columns, rows, {
    startY: y,
    headerFill: GLONETZ_BRAND.tableHeader,
    headerText: [255, 255, 255],
    rowFillEven: GLONETZ_BRAND.rowEven,
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (rowIndex, colIndex) => {
      const direction = report.rows[rowIndex]?.direction
      if (colIndex === 0 || colIndex === 4) {
        return direction === "in" ? [21, 128, 61] : [220, 38, 38]
      }
      return undefined
    },
  })

  y += 6
  const summaryColumns: PdfTableColumn[] = [
    { header: "Synthese periode", width: 118, align: "left" },
    { header: "Montant", width: 62, align: "right" },
  ]
  const summaryRows = [
    ["Budgets recus", formatFcfaForPdf(report.totals.budgetsIn)],
    ["Depenses enregistrees", formatFcfaForPdf(report.totals.expensesOut)],
  ]

  y = drawPdfTable(doc, summaryColumns, summaryRows, {
    startY: y,
    x: left,
    headerFill: GLONETZ_BRAND.summaryHeader,
    headerText: [255, 255, 255],
    rowFillEven: GLONETZ_BRAND.rowEven,
    rowFillOdd: [255, 255, 255],
    getCellTextColor: (_row, colIndex, context) => {
      if (colIndex !== 1) return undefined
      if (context === "footer") {
        return report.totals.periodBalance >= 0 ? [21, 128, 61] : [220, 38, 38]
      }
      return _row === 0 ? [21, 128, 61] : [220, 38, 38]
    },
    footerRow: ["Solde periode (budgets - depenses)", formatFcfaForPdf(report.totals.periodBalance)],
    footerFill: GLONETZ_BRAND.footerFill,
    footerText: GLONETZ_BRAND.footerText,
  })

  y += 4
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(
    sanitizeTextForPdf(`Solde restant actuel : ${formatFcfaForPdf(report.accountBalance)}`),
    left,
    y,
  )
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    sanitizeTextForPdf("Document genere depuis l'administration Glonetz."),
    left,
    Math.min(y, doc.internal.pageSize.getHeight() - 10),
  )

  doc.save(`rapport-manager-${report.managerId}-${report.from}-${report.to}.pdf`)
}
