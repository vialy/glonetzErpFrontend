"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import type {
  CreateManagerExpenseInput,
  ManagerBudgetSummary,
  ManagerExpenseRecord,
} from "@/domains/manager-wallet/types"
import {
  parseExpenseList,
  mapApiExpenseToRecord,
  toCreateExpenseBody,
  toCreateExpenseFormData,
} from "@/lib/expense-api-mapper"
import { fetchAllAccounts, fetchMyAccount, STAFF_ACCOUNTS_UPDATED_EVENT } from "@/services/staff-accounts.service"

const PAGE_SIZE = 100
const MAX_PAGES = 50

export const EXPENSES_UPDATED_EVENT = "manager-wallet-updated"

function notifyUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EXPENSES_UPDATED_EVENT))
    window.dispatchEvent(new Event(STAFF_ACCOUNTS_UPDATED_EVENT))
  }
}

function mapApiError(error: unknown): Error {
  if (error instanceof ApiClientError) {
    if (error.errorCode === 3003 || /insufficient/i.test(error.message)) {
      return new Error("INSUFFICIENT_BALANCE")
    }
    if (/category|description/i.test(error.message)) {
      return new Error("CATEGORY_REQUIRED")
    }
    if (/amount|validation/i.test(error.message)) {
      return new Error("INVALID_AMOUNT")
    }
  }
  if (error instanceof Error) return error
  return new Error("UNKNOWN")
}

export async function fetchStaffExpenses(query: {
  staffId?: string
  from?: string
  to?: string
  scope?: "extraordinary" | "manager"
  accountId?: string
} = {}): Promise<ManagerExpenseRecord[]> {
  const rows: ManagerExpenseRecord[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>("/staff/expenses", {
      method: "GET",
      query: {
        pageNum,
        pageSize: PAGE_SIZE,
        staffId: query.staffId,
        from: query.from,
        to: query.to,
        scope: query.scope,
        accountId: query.accountId,
      },
    })
    const batch = parseExpenseList(data)
    rows.push(...batch)
    const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
    const totalPages = typeof root.totalPages === "number" ? root.totalPages : 1
    if (batch.length < PAGE_SIZE || pageNum >= totalPages) break
    pageNum += 1
  }

  return rows.sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
}

export async function createStaffExpense(
  input: CreateManagerExpenseInput,
): Promise<ManagerExpenseRecord> {
  try {
    const hasProof = Boolean(input.attachmentFile && input.attachmentFile.size > 0)
    const data = await apiRequest<unknown>("/staff/expenses", {
      method: "POST",
      body: hasProof ? toCreateExpenseFormData(input) : toCreateExpenseBody(input),
    })
    const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
    const expense = mapApiExpenseToRecord(root.expense ?? data)
    if (!expense) throw new Error("INVALID_RESPONSE")
    notifyUpdated()
    return expense
  } catch (error) {
    throw mapApiError(error)
  }
}

/** Dépense extraordinaire admin — débitée du compte société ou virtuel sélectionné. */
export async function createExtraordinaryExpense(input: {
  label: string
  amount: number
  spentAt?: string
  comment?: string
}): Promise<ManagerExpenseRecord> {
  const spentAt = input.spentAt ?? new Date().toISOString().slice(0, 10)
  return createStaffExpense({
    categoryId: "",
    categoryLabel: input.label.trim(),
    amount: Math.round(input.amount),
    spentAt,
    comment: input.comment?.trim() || undefined,
  })
}

export async function fetchExtraordinaryExpenses(query: {
  from?: string
  to?: string
  accountId?: string
} = {}): Promise<ManagerExpenseRecord[]> {
  return fetchStaffExpenses({ ...query, scope: "extraordinary" })
}

async function resolveManagerAccount(managerStaffId: string) {
  const accounts = await fetchAllAccounts()
  return (
    accounts.find((a) => a.owner?.staffId === managerStaffId && a.type === "staff") ??
    accounts.find((a) => a.owner?.staffId === managerStaffId) ??
    null
  )
}

export async function fetchManagerBudgetSummary(
  managerStaffId?: string,
): Promise<ManagerBudgetSummary> {
  const [account, expenses] = await Promise.all([
    managerStaffId ? resolveManagerAccount(managerStaffId) : fetchMyAccount(),
    fetchStaffExpenses(managerStaffId ? { staffId: managerStaffId } : {}),
  ])

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const remaining = account?.balance ?? 0

  return {
    envelopeCeiling: remaining + totalSpent,
    totalSpent,
    remaining,
    currencyCode: account?.currencyCode ?? "XAF",
  }
}

export async function fetchAdminManagerSnapshots(
  managerIds: { id: string; fullName: string }[],
): Promise<
  Array<{
    managerId: string
    fullName: string
    allocated: number
    spent: number
    remaining: number
  }>
> {
  const [accounts, expenses] = await Promise.all([
    fetchAllAccounts(),
    fetchStaffExpenses({ scope: "manager" }),
  ])

  return managerIds.map((manager) => {
    const account =
      accounts.find((a) => a.owner?.staffId === manager.id && a.type === "staff") ??
      accounts.find((a) => a.owner?.staffId === manager.id)
    const managerExpenses = expenses.filter((e) => e.managerId === manager.id)
    const spent = managerExpenses.reduce((sum, e) => sum + e.amount, 0)
    const remaining = account?.balance ?? 0
    return {
      managerId: manager.id,
      fullName: manager.fullName,
      allocated: remaining + spent,
      spent,
      remaining,
    }
  })
}
