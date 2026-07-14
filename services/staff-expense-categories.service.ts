"use client"

import { apiRequest } from "@/core/api/client"
import type { ManagerCategoryOption } from "@/domains/manager-wallet/types"

const ENDPOINT = "/staff/expense-categories"
const PAGE_SIZE = 100
const MAX_PAGES = 10

const KNOWN_ICONS = new Set<ManagerCategoryOption["icon"]>([
  "Package",
  "Zap",
  "Droplets",
  "Wifi",
  "Wrench",
  "Truck",
  "GraduationCap",
  "HandCoins",
  "MoreHorizontal",
])

function normalizeCategoryIcon(value: unknown): ManagerCategoryOption["icon"] {
  const icon = String(value ?? "MoreHorizontal")
  return KNOWN_ICONS.has(icon as ManagerCategoryOption["icon"])
    ? (icon as ManagerCategoryOption["icon"])
    : "MoreHorizontal"
}

export type ExpenseCategoryRecord = {
  expenseCategoryId: string
  categoryKey: string
  label: string
  icon: ManagerCategoryOption["icon"]
  isBuiltin: boolean
  isActive: boolean
  sortOrder: number
}

function extractCategoryArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []
  const record = data as Record<string, unknown>
  if (Array.isArray(record.docs)) return record.docs
  if (Array.isArray(record.items)) return record.items
  if (record.expenseCategory && typeof record.expenseCategory === "object") {
    return [record.expenseCategory]
  }
  if (record.data && typeof record.data === "object") return extractCategoryArray(record.data)
  return []
}

function mapApiExpenseCategory(data: unknown): ExpenseCategoryRecord | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const categoryKey = String(record.categoryKey ?? "").trim()
  const label = String(record.label ?? "").trim()
  if (!categoryKey || !label) return null
  const icon = normalizeCategoryIcon(record.icon)
  return {
    expenseCategoryId: String(record.expenseCategoryId ?? record.id ?? ""),
    categoryKey,
    label,
    icon,
    isBuiltin: record.isBuiltin === true,
    isActive: record.isActive !== false,
    sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : 100,
  }
}

export function mapExpenseCategoryToOption(category: ExpenseCategoryRecord): ManagerCategoryOption {
  return {
    id: category.categoryKey,
    customLabel: category.label,
    icon: category.icon,
  }
}

export async function fetchStaffExpenseCategories(): Promise<ExpenseCategoryRecord[]> {
  const rows: ExpenseCategoryRecord[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>(ENDPOINT, {
      method: "GET",
      query: { pageNum, pageSize: PAGE_SIZE, isActive: "true" },
    })
    const batch = extractCategoryArray(data)
      .map(mapApiExpenseCategory)
      .filter((item): item is ExpenseCategoryRecord => item !== null)
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    pageNum += 1
  }

  return rows
}

export async function createStaffExpenseCategory(label: string): Promise<ExpenseCategoryRecord> {
  const data = await apiRequest<unknown>(ENDPOINT, {
    method: "POST",
    body: { label: label.trim() },
  })
  const created = mapApiExpenseCategory(
    data && typeof data === "object" && "expenseCategory" in (data as object)
      ? (data as Record<string, unknown>).expenseCategory
      : data,
  )
  if (!created) throw new Error("INVALID_EXPENSE_CATEGORY_RESPONSE")
  return created
}
