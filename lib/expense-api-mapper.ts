import type {
  CreateManagerExpenseInput,
  ManagerExpenseRecord,
} from "@/domains/manager-wallet/types"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/\s/g, ""))
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asIsoDate(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return undefined
}

/** Re-anchor uploaded asset URLs onto NEXT_PUBLIC_API_BASE_URL (same as claims). */
function absoluteApiAssetUrl(url?: string): string | undefined {
  if (!url) return undefined
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  if (!base) return url
  try {
    const parsed = new URL(url)
    return `${base}${parsed.pathname}${parsed.search}`
  } catch {
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`
  }
}

function resolveStaffFriendlyId(staffField: unknown): string | undefined {
  const populated = asRecord(staffField)
  if (populated) return asString(populated.staffId)
  return undefined
}

function resolveAccountFields(accountField: unknown): {
  accountType?: string
  accountId?: string
  accountName?: string
} {
  const populated = asRecord(accountField)
  if (!populated) return {}
  return {
    accountType: asString(populated.type),
    accountId: asString(populated.accountId),
    accountName: asString(populated.name),
  }
}

export function mapApiExpenseToRecord(raw: unknown): ManagerExpenseRecord | null {
  const row = asRecord(raw)
  if (!row) return null

  const id = asString(row.expenseId)
  const amount = asNumber(row.amount)
  if (!id || amount === undefined) return null

  const createdAt = asIsoDate(row.createdAt) ?? new Date().toISOString()
  const spentAt = asIsoDate(row.spentAt) ?? createdAt
  const proof = absoluteApiAssetUrl(asString(row.proofUrl))
  const account = resolveAccountFields(row.accountId)

  return {
    id,
    createdAt,
    spentAt,
    categoryId: asString(row.categoryId) ?? "other",
    categoryLabel: asString(row.categoryLabel) ?? asString(row.description) ?? "Dépense",
    amount,
    currencyCode: asString(row.currencyCode) ?? "XAF",
    comment: asString(row.comment),
    attachmentDataUrl: proof,
    attachmentName: asString(row.proofFileName) ?? (proof ? proof.split("/").pop() : undefined),
    managerId: resolveStaffFriendlyId(row.staffId),
    accountType: account.accountType ?? asString(row.accountType),
    accountId: account.accountId ?? asString(row.accountFriendlyId),
    accountName: account.accountName,
  }
}

export function extractExpenseDocs(data: unknown): unknown[] {
  const root = asRecord(data)
  if (!root) return []
  if (Array.isArray(root.docs)) return root.docs
  const expense = asRecord(root.expense)
  if (expense) return [expense]
  const nested = asRecord(root.data)
  if (nested) {
    if (Array.isArray(nested.docs)) return nested.docs
    const nestedExpense = asRecord(nested.expense)
    if (nestedExpense) return [nestedExpense]
  }
  return []
}

export function parseExpenseList(data: unknown): ManagerExpenseRecord[] {
  return extractExpenseDocs(data)
    .map((row) => mapApiExpenseToRecord(row))
    .filter((row): row is ManagerExpenseRecord => row !== null)
}

export function toCreateExpenseBody(input: CreateManagerExpenseInput) {
  const spentAt = input.spentAt.includes("T") ? input.spentAt : `${input.spentAt}T12:00:00.000Z`
  return {
    amount: Math.round(input.amount),
    spentAt,
    categoryId: input.categoryId,
    categoryLabel: input.categoryLabel.trim(),
    comment: input.comment?.trim() || undefined,
    accountId: input.accountId?.trim() || undefined,
  }
}

export function toCreateExpenseFormData(input: CreateManagerExpenseInput): FormData {
  const body = toCreateExpenseBody(input)
  const form = new FormData()
  form.append("amount", String(body.amount))
  form.append("spentAt", body.spentAt)
  form.append("categoryId", body.categoryId)
  form.append("categoryLabel", body.categoryLabel)
  if (body.comment) form.append("comment", body.comment)
  if (body.accountId) form.append("accountId", body.accountId)
  if (input.attachmentFile && input.attachmentFile.size > 0) {
    form.append("proof", input.attachmentFile)
  }
  return form
}
