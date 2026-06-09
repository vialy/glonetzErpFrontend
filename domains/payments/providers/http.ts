"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import type {
  ApplyClaimPaymentInput,
  CreatePaymentInput,
  PaymentsProvider,
  StudentPaymentRecord,
  StudentTuitionSummary,
} from "@/domains/payments/types"

function extractErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const r = payload as Record<string, unknown>

  const candidate = (r.code ?? r.errorCode ?? r.type ?? r.error ?? r.message ?? r.key) as
    | unknown
    | undefined

  if (typeof candidate === "string" && candidate.trim().length > 0) return candidate
  return undefined
}

function rethrowAsBusinessCode(error: unknown): never {
  if (error instanceof ApiClientError) {
    const code = extractErrorCode(error.payload)
    if (code) throw new Error(code)
  }
  throw error
}

function mapMethodToNeeroProvider(method: CreatePaymentInput["paymentMethod"]) {
  if (method === "orange_money") return "ORANGE_MONEY"
  if (method === "mtn_momo") return "MTN_MONEY"
  return null
}

export const httpPaymentsProvider: PaymentsProvider = {
  async getSummary() {
    try {
      return await apiRequest<StudentTuitionSummary>("/payments/me/summary", { method: "GET" })
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
  async getPayments() {
    try {
      return await apiRequest<StudentPaymentRecord[]>("/payments/me", { method: "GET" })
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
  async createPayment(input: CreatePaymentInput) {
    try {
      const neeroBackendUrl = process.env.NEXT_PUBLIC_NEERO_BACKEND_URL
      if (neeroBackendUrl) {
        const provider = mapMethodToNeeroProvider(input.paymentMethod)
        if (!provider) {
          throw new Error("UNSUPPORTED_PAYMENT_METHOD")
        }
        if (!input.phoneNumber?.trim()) {
          throw new Error("PHONE_REQUIRED")
        }

        const response = await fetch(`${neeroBackendUrl}/api/payments/learner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: input.amount,
            phoneNumber: input.phoneNumber.trim(),
            provider,
            countryIso: "CM",
            currencyCode: input.currencyCode ?? "XAF",
            confirm: true,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.ok) {
          const candidate = extractErrorCode(payload)
          if (candidate) throw new Error(candidate)
          throw new Error("NEERO_BACKEND_ERROR")
        }

        const intentId = payload?.transactionIntent?.id ?? payload?.transactionIntent?.transactionIntentId
        return {
          paymentId: intentId || `NEERO-${Date.now()}`,
          amount: Number(input.amount),
          currencyCode: input.currencyCode ?? "XAF",
          paymentMethod: input.paymentMethod,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          note: input.note,
        } satisfies StudentPaymentRecord
      }

      return await apiRequest<StudentPaymentRecord>("/payments", { method: "POST", body: input as any })
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
  async applyClaimPayment(input: ApplyClaimPaymentInput) {
    try {
      return await apiRequest<StudentPaymentRecord>("/payments/claims/apply", { method: "POST", body: input as any })
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
}

