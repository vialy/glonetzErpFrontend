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

