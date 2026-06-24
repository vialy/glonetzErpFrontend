"use client"

import type {
  CreateManagerExpenseInput,
  ManagerBudgetAllocation,
  ManagerBudgetSummary,
  ManagerExpenseRecord,
} from "@/domains/manager-wallet/types"

const STORAGE_KEY = "glonetz_manager_wallets_v3"
const LEGACY_KEY = "glonetz_manager_wallet_v2"
const DEFAULT_MANAGER_ID = "u2"

interface PersistedState {
  envelopeCeiling: number
  expenses: ManagerExpenseRecord[]
  allocations: ManagerBudgetAllocation[]
  periodHint: string
}

type WalletsStore = Record<string, PersistedState>

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function defaultState(): PersistedState {
  return {
    envelopeCeiling: 0,
    expenses: [],
    allocations: [],
    periodHint: "",
  }
}

function readStore(): WalletsStore {
  if (!canUseStorage()) return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WalletsStore
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_KEY)
  if (!legacyRaw) return {}
  try {
    const legacy = JSON.parse(legacyRaw) as Partial<PersistedState>
    if (typeof legacy.envelopeCeiling !== "number" || !Array.isArray(legacy.expenses)) return {}
    const migrated: WalletsStore = {
      [DEFAULT_MANAGER_ID]: {
        envelopeCeiling: legacy.envelopeCeiling,
        expenses: legacy.expenses,
        allocations: Array.isArray(legacy.allocations) ? legacy.allocations : [],
        periodHint: typeof legacy.periodHint === "string" ? legacy.periodHint : "",
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    return migrated
  } catch {
    return {}
  }
}

function writeStore(store: WalletsStore) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event("manager-wallet-updated"))
}

function readState(managerId: string): PersistedState {
  const store = readStore()
  return store[managerId] ?? defaultState()
}

function writeState(managerId: string, state: PersistedState) {
  const store = readStore()
  store[managerId] = state
  writeStore(store)
}

function totalSpent(expenses: ManagerExpenseRecord[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0)
}

function inferPeriodHint(allocations: ManagerBudgetAllocation[]): string {
  const latest = allocations[0]
  if (!latest) return ""
  return new Date(latest.allocatedAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })
}

function buildSummary(state: PersistedState): ManagerBudgetSummary {
  const spent = totalSpent(state.expenses)
  return {
    envelopeCeiling: state.envelopeCeiling,
    totalSpent: spent,
    remaining: Math.max(state.envelopeCeiling - spent, 0),
    currencyCode: "XOF",
    periodHint: state.periodHint,
  }
}

export const ManagerWalletService = {
  getSummary(managerId: string = DEFAULT_MANAGER_ID): ManagerBudgetSummary {
    return buildSummary(readState(managerId))
  },

  getGlobalSummary(): ManagerBudgetSummary {
    const store = readStore()
    let envelopeCeiling = 0
    let totalSpentSum = 0
    for (const state of Object.values(store)) {
      envelopeCeiling += state.envelopeCeiling
      totalSpentSum += totalSpent(state.expenses)
    }
    return {
      envelopeCeiling,
      totalSpent: totalSpentSum,
      remaining: Math.max(envelopeCeiling - totalSpentSum, 0),
      currencyCode: "XOF",
    }
  },

  listManagerIds(): string[] {
    const store = readStore()
    const ids = Object.keys(store)
    return ids.length > 0 ? ids : [DEFAULT_MANAGER_ID]
  },

  getExpenses(managerId: string = DEFAULT_MANAGER_ID): ManagerExpenseRecord[] {
    return [...readState(managerId).expenses].sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
  },

  getAllExpenses(): Array<ManagerExpenseRecord & { managerId: string }> {
    const store = readStore()
    const out: Array<ManagerExpenseRecord & { managerId: string }> = []
    for (const [managerId, state] of Object.entries(store)) {
      for (const expense of state.expenses) {
        out.push({ ...expense, managerId })
      }
    }
    return out.sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
  },

  getAllocations(managerId: string = DEFAULT_MANAGER_ID): ManagerBudgetAllocation[] {
    return [...readState(managerId).allocations].sort((a, b) => (a.allocatedAt < b.allocatedAt ? 1 : -1))
  },

  registerAdminAllocation(
    managerId: string,
    input: { amount: number; note: string },
  ): ManagerBudgetAllocation {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("INVALID_AMOUNT")
    }
    const note = input.note.trim() || "Allocation admin"
    const state = readState(managerId)
    const allocatedAt = new Date().toISOString()
    const allocation: ManagerBudgetAllocation = {
      id: `ALL-${Date.now()}`,
      allocatedAt,
      amount: input.amount,
      note,
      managerId,
    }
    const nextAllocations = [allocation, ...state.allocations]
    writeState(managerId, {
      ...state,
      allocations: nextAllocations,
      envelopeCeiling: state.envelopeCeiling + input.amount,
      periodHint: inferPeriodHint(nextAllocations),
    })
    return allocation
  },

  async createExpense(
    managerId: string,
    input: CreateManagerExpenseInput,
  ): Promise<ManagerExpenseRecord> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("INVALID_AMOUNT")
    }
    if (!input.categoryId || !input.categoryLabel.trim()) {
      throw new Error("CATEGORY_REQUIRED")
    }
    const state = readState(managerId)
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
      managerId,
    }

    writeState(managerId, {
      ...state,
      expenses: [record, ...state.expenses],
    })
    return record
  },
}
