import type { PaymentMethod } from "@/domains/payments/types"

/** Encaissement lié aux paiements apprenants (vue consolidée audit). */
export interface AuditPaymentReceived {
  id: string
  recordedAt: string
  studentName: string
  className: string
  amount: number
  currencyCode: string
  paymentMethod: PaymentMethod
  externalReference?: string
}

/** Dépense saisie par le manager (petite caisse). */
export interface AuditManagerExpense {
  id: string
  spentAt: string
  category: string
  amount: number
  currencyCode: string
  comment?: string
  managerLabel: string
}

/** Dépense extraordinaire saisie par l’administration. */
export interface AuditExtraordinaryExpense {
  id: string
  spentAt: string
  description: string
  category?: string
  amount: number
  currencyCode: string
}

export interface AuditFinancialSummary {
  periodLabel: string
  totalPaymentsIn: number
  totalManagerExpenses: number
  totalExtraordinaryExpenses: number
  theoreticalNetBalance: number
  currencyCode: string
  paymentCount: number
  managerExpenseCount: number
  extraordinaryCount: number
}

export interface AuditDateRange {
  from: string
  to: string
}
