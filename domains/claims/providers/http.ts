"use client"

import { apiRequest } from "@/core/api/client"
import type { ClaimRecord, ClaimsProvider, CreateClaimInput } from "@/domains/claims/types"

export const httpClaimsProvider: ClaimsProvider = {
  async getAll() {
    return apiRequest<ClaimRecord[]>("/claims/me", { method: "GET" })
  },
  async create(input: CreateClaimInput) {
    const body = new FormData()
    body.append("amount", String(input.amount))
    body.append("paymentMethod", input.paymentMethod)
    body.append("phoneNumber", input.phoneNumber)
    body.append("transactionReference", input.transactionReference)
    body.append("description", input.description)
    if (input.screenshotFile) body.append("screenshot", input.screenshotFile)
    return apiRequest<ClaimRecord>("/claims", { method: "POST", body })
  },
  async updateStatus(id, status) {
    return apiRequest<ClaimRecord>(`/claims/${id}/status`, { method: "PATCH", body: { status } })
  },
}

