"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MANAGER_EXPENSE_CATEGORIES } from "@/domains/manager-wallet/categories"
import type { ManagerCategoryOption } from "@/domains/manager-wallet/types"
import { isApiDataProvider } from "@/lib/data-provider"
import {
  loadManagerCustomCategories,
  notifyManagerCustomCategoriesUpdated,
  saveManagerCustomCategories,
  slugifyCustomCategoryId,
  toManagerCategoryOption,
} from "@/lib/manager-custom-categories"
import {
  createStaffExpenseCategory,
  fetchStaffExpenseCategories,
  mapExpenseCategoryToOption,
} from "@/services/staff-expense-categories.service"
import type { TranslationKey } from "@/services/i18n"
import { useLocale } from "@/hooks/use-locale"

const BUILTIN_CATEGORIES = MANAGER_EXPENSE_CATEGORIES.filter((category) => category.id !== "other")
const OTHER_CATEGORY = MANAGER_EXPENSE_CATEGORIES.find((category) => category.id === "other")!
/** System-only categories (auto ledger), not selectable when creating expenses. */
const SYSTEM_CATEGORY_IDS = new Set(["manager_allocation"])

export function getManagerCategoryLabel(
  category: ManagerCategoryOption,
  t: (key: TranslationKey) => string,
): string {
  if (category.customLabel?.trim()) return category.customLabel.trim()
  if (category.labelKey) return t(category.labelKey)
  return category.id
}

export function useManagerExpenseCategories(managerId: string | undefined) {
  const { t } = useLocale()
  const isApi = isApiDataProvider()
  const [apiCategories, setApiCategories] = useState<ManagerCategoryOption[]>([])
  const [mockCategories, setMockCategories] = useState<ManagerCategoryOption[]>([])
  const [loading, setLoading] = useState(isApi)

  const reloadMock = useCallback(() => {
    if (!managerId) {
      setMockCategories([])
      return
    }
    setMockCategories(loadManagerCustomCategories(managerId).map(toManagerCategoryOption))
  }, [managerId])

  const reloadApi = useCallback(async () => {
    if (!isApi) return
    setLoading(true)
    try {
      const rows = await fetchStaffExpenseCategories()
      setApiCategories(rows.map(mapExpenseCategoryToOption))
    } finally {
      setLoading(false)
    }
  }, [isApi])

  useEffect(() => {
    if (isApi) {
      void reloadApi()
      return
    }
    reloadMock()
  }, [isApi, reloadApi, reloadMock])

  useEffect(() => {
    if (isApi) return undefined
    const onUpdated = () => reloadMock()
    window.addEventListener("manager-custom-categories-updated", onUpdated)
    return () => window.removeEventListener("manager-custom-categories-updated", onUpdated)
  }, [isApi, reloadMock])

  const categories = useMemo(() => {
    const selectable = (items: ManagerCategoryOption[]) =>
      items.filter((category) => !SYSTEM_CATEGORY_IDS.has(category.id))
    if (isApi) return [...selectable(apiCategories), OTHER_CATEGORY]
    return [...BUILTIN_CATEGORIES, ...selectable(mockCategories), OTHER_CATEGORY]
  }, [apiCategories, isApi, mockCategories])

  const getCategoryLabel = useCallback(
    (category: ManagerCategoryOption) => getManagerCategoryLabel(category, t),
    [t],
  )

  const addCustomCategory = useCallback(
    async (label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return null

      if (isApi) {
        try {
          const created = await createStaffExpenseCategory(trimmed)
          const option = mapExpenseCategoryToOption(created)
          setApiCategories((prev) => {
            const exists = prev.some((item) => item.id === option.id)
            if (exists) {
              return prev.map((item) => (item.id === option.id ? option : item))
            }
            return [...prev, option]
          })
          return option
        } catch (error) {
          const duplicate = apiCategories.find(
            (item) => getManagerCategoryLabel(item, t).toLowerCase() === trimmed.toLowerCase(),
          )
          if (duplicate) return duplicate
          if (error instanceof Error && error.message === "INVALID_EXPENSE_CATEGORY_RESPONSE") {
            throw new Error("EXPENSE_CATEGORY_CREATE_FAILED")
          }
          throw error
        }
      }

      if (!managerId) return null
      const existing = loadManagerCustomCategories(managerId)
      const duplicate = existing.find((item) => item.label.toLowerCase() === trimmed.toLowerCase())
      if (duplicate) {
        const option = toManagerCategoryOption(duplicate)
        setMockCategories(existing.map(toManagerCategoryOption))
        return option
      }

      const created = {
        id: slugifyCustomCategoryId(trimmed),
        label: trimmed,
        createdAt: new Date().toISOString(),
      }
      const next = [...existing, created]
      saveManagerCustomCategories(managerId, next)
      notifyManagerCustomCategoriesUpdated()
      const option = toManagerCategoryOption(created)
      setMockCategories(next.map(toManagerCategoryOption))
      return option
    },
    [apiCategories, isApi, managerId, t],
  )

  return {
    categories,
    loading,
    addCustomCategory,
    getCategoryLabel,
    reload: isApi ? reloadApi : reloadMock,
  }
}
