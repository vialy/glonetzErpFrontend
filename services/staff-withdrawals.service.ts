"use client"

import { apiRequest } from "@/core/api/client"
import { isApiDataProvider } from "@/lib/data-provider"
import { parseWithdrawalAccountList } from "@/lib/withdrawal-account-api-mapper"
import type { WithdrawalAccountRecord } from "@/domains/withdrawal-accounts/types"
import { STAFF_ACCOUNTS_UPDATED_EVENT } from "@/services/staff-accounts.service"
import { EXPENSES_UPDATED_EVENT } from "@/services/staff-expenses.service"

export type StaffWithdrawalRecord = {
  id: string
  amount: number
  netAmount?: number
  feeAmount?: number
  totalAmount?: number
  currencyCode: string
  provider: string
  status: "pending" | "successful" | "failed"
  createdAt: string
  beneficiaryStaffId?: string
  beneficiaryName?: string
  phoneNumber?: string
  gatewayReference?: string
  gatewayPaymentRef?: string
  failureReason?: string
}

export type InitiateStaffWithdrawalInput = {
  beneficiaryStaffId: string
  withdrawalAccountId: string
  netAmount: number
  description?: string
}

const WITHDRAWALS_UPDATED_EVENT = "staff-withdrawals-updated"
const PAGE_SIZE = 100
const MAX_PAGES = 20

function notifyAccountsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STAFF_ACCOUNTS_UPDATED_EVENT))
    window.dispatchEvent(new Event(EXPENSES_UPDATED_EVENT))
    window.dispatchEvent(new Event(WITHDRAWALS_UPDATED_EVENT))
    window.dispatchEvent(new Event("manager-wallet-updated"))
  }
}

export { WITHDRAWALS_UPDATED_EVENT }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseWithdrawal(data: unknown): StaffWithdrawalRecord | null {
  const root = asRecord(data)
  if (!root) return null
  const nested = asRecord(root.data)
  const row = asRecord(root.withdrawal ?? nested?.withdrawal ?? root)
  if (!row) return null
  const id = typeof row.withdrawalId === "string" ? row.withdrawalId : undefined
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount)
  if (!id || !Number.isFinite(amount)) return null
  const statusRaw = typeof row.status === "string" ? row.status : "pending"
  const status =
    statusRaw === "successful" || statusRaw === "failed" ? statusRaw : ("pending" as const)

  const staff = asRecord(row.staffId)
  const wda = asRecord(row.withdrawalAccountId)

  return {
    id,
    amount,
    netAmount: typeof row.netAmount === "number" ? row.netAmount : undefined,
    feeAmount: typeof row.feeAmount === "number" ? row.feeAmount : undefined,
    totalAmount: typeof row.amount === "number" ? row.amount : amount,
    currencyCode: typeof row.currencyCode === "string" ? row.currencyCode : "XAF",
    provider: typeof row.provider === "string" ? row.provider : "pending",
    status,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date().toISOString(),
    beneficiaryStaffId: typeof staff?.staffId === "string" ? staff.staffId : undefined,
    beneficiaryName: typeof staff?.name === "string" ? staff.name : undefined,
    phoneNumber: typeof wda?.phoneNumber === "string" ? wda.phoneNumber : undefined,
    gatewayReference: typeof row.gatewayReference === "string" ? row.gatewayReference : undefined,
    gatewayPaymentRef: typeof row.gatewayPaymentRef === "string" ? row.gatewayPaymentRef : undefined,
    failureReason: typeof row.failureReason === "string" ? row.failureReason : undefined,
  }
}

function extractWithdrawalArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const root = asRecord(data)
  if (!root) return []
  if (Array.isArray(root.docs)) return root.docs
  if (root.withdrawal) return [root.withdrawal]
  return []
}

export async function fetchStaffWithdrawals(): Promise<StaffWithdrawalRecord[]> {
  if (!isApiDataProvider()) return []

  const rows: StaffWithdrawalRecord[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>("/staff/withdrawals", {
      method: "GET",
      query: { pageNum, pageSize: PAGE_SIZE },
    })
    const batch = extractWithdrawalArray(data)
      .map(parseWithdrawal)
      .filter((item): item is StaffWithdrawalRecord => item !== null)
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    pageNum += 1
  }

  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function fetchStaffWithdrawalAccounts(staffId: string): Promise<WithdrawalAccountRecord[]> {
  if (!isApiDataProvider()) return []

  const data = await apiRequest<unknown>(`/staff/staff/${encodeURIComponent(staffId)}/withdrawal-accounts`, {
    method: "GET",
    query: { pageNum: 1, pageSize: 50 },
  })
  return parseWithdrawalAccountList(data).filter((a) => a.isVerified)
}

export async function initiateStaffWithdrawal(
  input: InitiateStaffWithdrawalInput,
): Promise<StaffWithdrawalRecord> {
  if (!isApiDataProvider()) {
    const feeAmount = Math.round(input.netAmount * 0.01)
    return {
      id: `WDR-MOCK-${Date.now()}`,
      amount: input.netAmount + feeAmount,
      netAmount: input.netAmount,
      feeAmount,
      totalAmount: input.netAmount + feeAmount,
      currencyCode: "XAF",
      provider: "neero",
      status: "successful",
      createdAt: new Date().toISOString(),
    }
  }

  const data = await apiRequest<unknown>("/staff/withdrawals", {
    method: "POST",
    body: {
      beneficiaryStaffId: input.beneficiaryStaffId,
      withdrawalAccountId: input.withdrawalAccountId,
      netAmount: Math.round(input.netAmount),
      description: input.description,
    },
  })
  const withdrawal = parseWithdrawal(data)
  if (!withdrawal) throw new Error("INVALID_RESPONSE")
  notifyAccountsUpdated()
  return withdrawal
}
