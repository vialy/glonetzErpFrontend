"use client"

import type {
  AuditDateRange,
  AuditExtraordinaryExpense,
  AuditFinancialSummary,
  AuditManagerExpense,
  AuditPaymentReceived,
} from "@/domains/accounting/types"

function inRange(isoDate: string, range: AuditDateRange): boolean {
  const d = isoDate.slice(0, 10)
  return d >= range.from && d <= range.to
}

function sum<T>(items: T[], getAmount: (x: T) => number): number {
  return items.reduce((acc, x) => acc + getAmount(x), 0)
}

const MOCK_PAYMENTS: AuditPaymentReceived[] = [
  {
    id: "ENC-2026-0142",
    recordedAt: "2026-03-28T09:12:00.000Z",
    studentName: "Kouam Marie",
    className: "A2 - Mars 2026",
    amount: 150_000,
    currencyCode: "XOF",
    paymentMethod: "mtn_momo",
    externalReference: "MM2403189271",
  },
  {
    id: "ENC-2026-0141",
    recordedAt: "2026-03-27T14:40:00.000Z",
    studentName: "Ndjock Paul",
    className: "B1 - Mars 2026",
    amount: 80_000,
    currencyCode: "XOF",
    paymentMethod: "orange_money",
    externalReference: "OM982736451",
  },
  {
    id: "ENC-2026-0140",
    recordedAt: "2026-03-26T11:05:00.000Z",
    studentName: "Fotsing Grace",
    className: "A1 - Jan 2026",
    amount: 162_000,
    currencyCode: "XOF",
    paymentMethod: "mtn_momo",
    externalReference: "MM2403161102",
  },
  {
    id: "ENC-2026-0138",
    recordedAt: "2026-03-22T16:22:00.000Z",
    studentName: "Tchouassi Eric",
    className: "A2 - Mars 2026",
    amount: 45_000,
    currencyCode: "XOF",
    paymentMethod: "orange_money",
  },
  {
    id: "ENC-2026-0135",
    recordedAt: "2026-03-18T08:30:00.000Z",
    studentName: "Mbarga Ines",
    className: "A1 - Jan 2026",
    amount: 100_000,
    currencyCode: "XOF",
    paymentMethod: "cash",
  },
]

const MOCK_MANAGER_EXPENSES: AuditManagerExpense[] = [
  {
    id: "DM-2026-089",
    spentAt: "2026-03-29T10:00:00.000Z",
    category: "Fournitures de bureau",
    amount: 18_500,
    currencyCode: "XOF",
    comment: "Ramettes papier + stylos",
    managerLabel: "Centre Yaoundé",
  },
  {
    id: "DM-2026-088",
    spentAt: "2026-03-25T14:20:00.000Z",
    category: "Electricité",
    amount: 42_000,
    currencyCode: "XOF",
    managerLabel: "Centre Yaoundé",
  },
  {
    id: "DM-2026-085",
    spentAt: "2026-03-20T09:00:00.000Z",
    category: "Entretien locaux",
    amount: 25_000,
    currencyCode: "XOF",
    comment: "Nettoyage mensuel",
    managerLabel: "Centre Yaoundé",
  },
]

const MOCK_EXTRAORDINARY: AuditExtraordinaryExpense[] = [
  {
    id: "DE-2026-012",
    spentAt: "2026-03-15T12:00:00.000Z",
    description: "Travaux peinture salle polyvalente",
    category: "Immobilier",
    amount: 450_000,
    currencyCode: "XOF",
  },
  {
    id: "DE-2026-009",
    spentAt: "2026-03-05T11:30:00.000Z",
    description: "Achat vidéoprojecteur",
    category: "Equipement",
    amount: 280_000,
    currencyCode: "XOF",
  },
]

export const accountingAuditService = {
  getPaymentsInRange(range: AuditDateRange): AuditPaymentReceived[] {
    return MOCK_PAYMENTS.filter((p) => inRange(p.recordedAt, range)).sort((a, b) =>
      a.recordedAt < b.recordedAt ? 1 : -1
    )
  },

  getManagerExpensesInRange(range: AuditDateRange): AuditManagerExpense[] {
    return MOCK_MANAGER_EXPENSES.filter((e) => inRange(e.spentAt, range)).sort((a, b) =>
      a.spentAt < b.spentAt ? 1 : -1
    )
  },

  getExtraordinaryInRange(range: AuditDateRange): AuditExtraordinaryExpense[] {
    return MOCK_EXTRAORDINARY.filter((e) => inRange(e.spentAt, range)).sort((a, b) =>
      a.spentAt < b.spentAt ? 1 : -1
    )
  },

  getSummary(range: AuditDateRange): AuditFinancialSummary {
    const payments = this.getPaymentsInRange(range)
    const manager = this.getManagerExpensesInRange(range)
    const extra = this.getExtraordinaryInRange(range)
    const totalIn = sum(payments, (p) => p.amount)
    const totalMgr = sum(manager, (m) => m.amount)
    const totalExt = sum(extra, (e) => e.amount)

    return {
      periodLabel: `${range.from} → ${range.to}`,
      totalPaymentsIn: totalIn,
      totalManagerExpenses: totalMgr,
      totalExtraordinaryExpenses: totalExt,
      theoreticalNetBalance: totalIn - totalMgr - totalExt,
      currencyCode: "XOF",
      paymentCount: payments.length,
      managerExpenseCount: manager.length,
      extraordinaryCount: extra.length,
    }
  },
}
