"use client"

import { apiRequest } from "@/core/api/client"
import type {
  AddWithdrawalAccountInput,
  WithdrawalAccountRecord,
  WithdrawalProvider,
} from "@/domains/withdrawal-accounts/types"
import { isApiDataProvider } from "@/lib/data-provider"
import {
  parseWithdrawalAccountCreate,
  parseWithdrawalAccountList,
} from "@/lib/withdrawal-account-api-mapper"

const MOCK_STORAGE_KEY = "glonetz_mock_withdrawal_accounts_v2"
const PAGE_SIZE = 50

export const WITHDRAWAL_ACCOUNTS_UPDATED_EVENT = "withdrawal-accounts-updated"

const OTP_PROVIDERS: WithdrawalProvider[] = ["mtn", "orange"]

function notifyUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WITHDRAWAL_ACCOUNTS_UPDATED_EVENT))
  }
}

function readMockAccounts(): WithdrawalAccountRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem("glonetz_mock_withdrawal_accounts_v1")
      if (legacy) {
        const parsed = JSON.parse(legacy) as WithdrawalAccountRecord[]
        if (Array.isArray(parsed)) {
          writeMockAccounts(parsed)
          return parsed
        }
      }
      return []
    }
    const parsed = JSON.parse(raw) as WithdrawalAccountRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeMockAccounts(accounts: WithdrawalAccountRecord[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(accounts))
  notifyUpdated()
}

export type NeeroVerifyResult = {
  id: string
  shortInfo: string
  phoneNumber: string
  dev?: boolean
}

export async function verifyNeeroWithdrawalAccount(phoneNumber: string): Promise<NeeroVerifyResult> {
  const trimmed = phoneNumber.trim()
  if (!isApiDataProvider()) {
    return {
      id: "dev-stub-neero-id",
      shortInfo: "DEV STUB",
      phoneNumber: trimmed,
      dev: true,
    }
  }

  const data = await apiRequest<unknown>("/staff/withdrawal-accounts/verify-neero", {
    method: "POST",
    body: { phoneNumber: trimmed },
  })
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const nested = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : {}
  const account =
    (root.neeroAccount as Record<string, unknown> | undefined) ??
    (nested.neeroAccount as Record<string, unknown> | undefined)
  if (!account || typeof account.id !== "string") throw new Error("INVALID_RESPONSE")
  return {
    id: account.id,
    shortInfo: typeof account.shortInfo === "string" ? account.shortInfo : account.id,
    phoneNumber: typeof account.phoneNumber === "string" ? account.phoneNumber : trimmed,
    dev: root.dev === true || nested.dev === true,
  }
}

export async function fetchMyWithdrawalAccounts(): Promise<WithdrawalAccountRecord[]> {
  if (!isApiDataProvider()) {
    return readMockAccounts().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }

  const data = await apiRequest<unknown>("/staff/withdrawal-accounts", {
    method: "GET",
    query: { pageNum: 1, pageSize: PAGE_SIZE },
  })
  return parseWithdrawalAccountList(data).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function addWithdrawalAccount(
  input: AddWithdrawalAccountInput,
): Promise<WithdrawalAccountRecord> {
  const phoneNumber = input.phoneNumber.trim()
  const holderName = input.holderName?.trim() || undefined
  const needsOtp = OTP_PROVIDERS.includes(input.provider)

  if (!isApiDataProvider()) {
    const record: WithdrawalAccountRecord = {
      id: `WDA-MOCK-${Date.now()}`,
      provider: input.provider,
      phoneNumber,
      holderName,
      isVerified: !needsOtp,
      createdAt: new Date().toISOString(),
    }
    writeMockAccounts([record, ...readMockAccounts()])
    return record
  }

  const data = await apiRequest<unknown>("/staff/withdrawal-accounts", {
    method: "POST",
    body: {
      provider: input.provider,
      phoneNumber,
      holderName,
    },
  })
  const account = parseWithdrawalAccountCreate(data)
  if (!account) throw new Error("INVALID_RESPONSE")
  notifyUpdated()
  return account
}

export async function verifyWithdrawalAccount(
  withdrawalAccountId: string,
  otp: string,
): Promise<void> {
  if (!isApiDataProvider()) {
    const accounts = readMockAccounts()
    const idx = accounts.findIndex((a) => a.id === withdrawalAccountId)
    if (idx < 0) throw new Error("withdrawal_account_not_found")
    if (!/^\d{6}$/.test(otp.trim())) throw new Error("otp_invalid")
    accounts[idx] = { ...accounts[idx], isVerified: true }
    writeMockAccounts(accounts)
    return
  }

  await apiRequest(`/staff/withdrawal-accounts/${withdrawalAccountId}/verify`, {
    method: "POST",
    body: { otp: otp.trim() },
  })
  notifyUpdated()
}

export async function resendWithdrawalOtp(withdrawalAccountId: string): Promise<void> {
  if (!isApiDataProvider()) {
    notifyUpdated()
    return
  }

  await apiRequest(`/staff/withdrawal-accounts/${withdrawalAccountId}/resend-otp`, {
    method: "POST",
  })
}

export async function deactivateWithdrawalAccount(withdrawalAccountId: string): Promise<void> {
  if (!isApiDataProvider()) {
    writeMockAccounts(readMockAccounts().filter((a) => a.id !== withdrawalAccountId))
    return
  }

  throw new Error("withdrawal_account_deactivate_unsupported")
}

/** Raccourci Neero — conservé pour compatibilité. */
export async function addNeeroWithdrawalAccount(input: {
  phoneNumber: string
  holderName?: string
}): Promise<WithdrawalAccountRecord> {
  return addWithdrawalAccount({ ...input, provider: "neero" })
}
