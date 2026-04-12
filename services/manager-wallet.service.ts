"use client"

import type {
  CreateManagerExpenseInput,
  ManagerBudgetAllocation,
  ManagerBudgetSummary,
  ManagerExpenseRecord,
} from "@/domains/manager-wallet/types"

const STORAGE_KEY = "glonetz_manager_wallet_v1"

interface PersistedState {
  envelopeCeiling: number
  expenses: ManagerExpenseRecord[]
  allocations: ManagerBudgetAllocation[]
  periodHint: string
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function defaultState(): PersistedState {
  const now = new Date().toISOString()
  return {
    envelopeCeiling: 350_000,
    expenses: [],
    allocations: [
      {
        id: "ALL-INIT",
        allocatedAt: now,
        amount: 350_000,
        note: "Allocation budget centre — Mars 2026",
      },
    ],
    periodHint: "Mars 2026",
  }
}

function readState(): PersistedState {
  if (!canUseStorage()) return defaultState()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultState()
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (typeof parsed.envelopeCeiling !== "number" || !Array.isArray(parsed.expenses)) {
      return defaultState()
    }
    return {
      envelopeCeiling: parsed.envelopeCeiling,
      expenses: parsed.expenses,
      allocations: Array.isArray(parsed.allocations) ? parsed.allocations : defaultState().allocations,
      periodHint: typeof parsed.periodHint === "string" ? parsed.periodHint : defaultState().periodHint,
    }
  } catch {
    return defaultState()
  }
}

function writeState(state: PersistedState) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event("manager-wallet-updated"))
}

function totalSpent(expenses: ManagerExpenseRecord[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0)
}

export const ManagerWalletService = {
  getSummary(): ManagerBudgetSummary {
    const s = readState()
    const spent = totalSpent(s.expenses)
    return {
      envelopeCeiling: s.envelopeCeiling,
      totalSpent: spent,
      remaining: Math.max(s.envelopeCeiling - spent, 0),
      currencyCode: "XOF",
      periodHint: s.periodHint,
    }
  },

  getExpenses(): ManagerExpenseRecord[] {
    return [...readState().expenses].sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
  },

  getAllocations(): ManagerBudgetAllocation[] {
    return [...readState().allocations].sort((a, b) => (a.allocatedAt < b.allocatedAt ? 1 : -1))
  },

  async createExpense(input: CreateManagerExpenseInput): Promise<ManagerExpenseRecord> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("INVALID_AMOUNT")
    }
    if (!input.categoryId || !input.categoryLabel.trim()) {
      throw new Error("CATEGORY_REQUIRED")
    }
    const state = readState()
    const spent = totalSpent(state.expenses)
    const remaining = state.envelopeCeiling - spent
    if (input.amount > remaining) {
      throw new Error("INSUFFICIENT_BALANCE")
    }

    let attachmentName: string | undefined
    let attachmentDataUrl: string | undefined
    if (input.attachmentFile && input.attachmentFile.size > 0) {
      attachmentName = input.attachmentFile.name
      attachmentDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("ATTACHMENT_READ_FAILED"))
        reader.readAsDataURL(input.attachmentFile as Blob)
      })
    }

    const record: ManagerExpenseRecord = {
      id: `DEP-${Date.now()}`,
      createdAt: new Date().toISOString(),
      spentAt: input.spentAt.includes("T") ? input.spentAt : `${input.spentAt}T12:00:00.000Z`,
      categoryId: input.categoryId,
      categoryLabel: input.categoryLabel.trim(),
      amount: input.amount,
      currencyCode: "XOF",
      paymentMethod: input.paymentMethod,
      comment: input.comment?.trim() || undefined,
      attachmentName,
      attachmentDataUrl,
    }

    writeState({
      ...state,
      expenses: [record, ...state.expenses],
    })
    return record
  },
}
