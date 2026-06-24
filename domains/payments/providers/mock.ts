"use client"

import type { PaymentsProvider } from "@/domains/payments/types"

export const mockPaymentsProvider: PaymentsProvider = {
  async getSummary() {
    throw new Error("STUDENT_PAYMENTS_NOT_AVAILABLE_IN_STAFF_APP")
  },
  async getPayments() {
    return []
  },
  async createPayment() {
    throw new Error("STUDENT_PAYMENTS_NOT_AVAILABLE_IN_STAFF_APP")
  },
  async applyClaimPayment(input) {
    return {
      paymentId: `PAY-CLM-${Date.now()}`,
      amount: input.amount,
      currencyCode: "XOF",
      paymentMethod: input.paymentMethod,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      note: input.note,
      sourceClaimId: input.claimId,
    }
  },
}
