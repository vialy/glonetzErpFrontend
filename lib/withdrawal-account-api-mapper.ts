import type { WithdrawalAccountRecord, WithdrawalProvider } from "@/domains/withdrawal-accounts/types"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function asIsoDate(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return undefined
}

const PROVIDERS: WithdrawalProvider[] = ["mtn", "orange", "neero"]

function asProvider(value: unknown): WithdrawalProvider | undefined {
  const raw = asString(value)?.toLowerCase()
  return PROVIDERS.includes(raw as WithdrawalProvider) ? (raw as WithdrawalProvider) : undefined
}

export function mapApiWithdrawalAccount(raw: unknown): WithdrawalAccountRecord | null {
  const row = asRecord(raw)
  if (!row) return null

  const id = asString(row.withdrawalAccountId)
  const provider = asProvider(row.provider)
  const phoneNumber = asString(row.phoneNumber)
  if (!id || !provider || !phoneNumber) return null

  return {
    id,
    provider,
    phoneNumber,
    holderName: asString(row.holderName),
    isVerified: asBool(row.isVerified) ?? false,
    createdAt: asIsoDate(row.createdAt) ?? new Date().toISOString(),
  }
}

export function extractWithdrawalAccountDocs(data: unknown): unknown[] {
  const root = asRecord(data)
  if (!root) return []
  if (Array.isArray(root.docs)) return root.docs
  const account = asRecord(root.withdrawalAccount)
  if (account) return [account]
  const nested = asRecord(root.data)
  if (nested) {
    if (Array.isArray(nested.docs)) return nested.docs
    const nestedAccount = asRecord(nested.withdrawalAccount)
    if (nestedAccount) return [nestedAccount]
  }
  return []
}

export function parseWithdrawalAccountList(data: unknown): WithdrawalAccountRecord[] {
  return extractWithdrawalAccountDocs(data)
    .map((row) => mapApiWithdrawalAccount(row))
    .filter((row): row is WithdrawalAccountRecord => row !== null)
}

export function parseWithdrawalAccountCreate(data: unknown): WithdrawalAccountRecord | null {
  const root = asRecord(data)
  if (!root) return null
  const nested = asRecord(root.data)
  const account = root.withdrawalAccount ?? nested?.withdrawalAccount ?? root
  return mapApiWithdrawalAccount(account)
}
