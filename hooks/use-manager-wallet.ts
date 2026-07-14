"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ManagerWalletService } from "@/domains/manager-wallet"
import type { ManagerBudgetAllocation, ManagerBudgetSummary, ManagerExpenseRecord } from "@/domains/manager-wallet/types"
import { authService } from "@/domains/auth"
import { resolveManagerIdByPhone } from "@/lib/resolve-manager-id"
import { isApiDataProvider } from "@/lib/data-provider"
import { getApiErrorMessage } from "@/lib/api-error"
import { useAuth } from "@/hooks/use-auth"
import {
  createStaffExpense,
  fetchManagerBudgetSummary,
  fetchStaffExpenses,
} from "@/services/staff-expenses.service"
import type { CreateManagerExpenseInput } from "@/domains/manager-wallet/types"

export function useManagerWalletId(): string {
  const session = authService.getSession()
  if (session?.staffUserId) return session.staffUserId
  return resolveManagerIdByPhone(session?.phone)
}

const EMPTY_SUMMARY: ManagerBudgetSummary = {
  envelopeCeiling: 0,
  totalSpent: 0,
  remaining: 0,
  currencyCode: "XAF",
}

export function useManagerWallet() {
  const managerId = useManagerWalletId()
  const { status, isAuthenticated } = useAuth()
  const apiMode = isApiDataProvider()
  const [tick, setTick] = useState(0)
  const [apiSummary, setApiSummary] = useState<ManagerBudgetSummary>(EMPTY_SUMMARY)
  const [apiExpenses, setApiExpenses] = useState<ManagerExpenseRecord[]>([])
  const [loading, setLoading] = useState(apiMode)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const loadApi = useCallback(async () => {
    if (!apiMode) return
    setLoading(true)
    setError(null)
    try {
      const [summary, expenses] = await Promise.all([
        fetchManagerBudgetSummary(),
        fetchStaffExpenses(),
      ])
      setApiSummary(summary)
      setApiExpenses(expenses)
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible de charger les dépenses."))
    } finally {
      setLoading(false)
    }
  }, [apiMode])

  useEffect(() => {
    window.addEventListener("manager-wallet-updated", refresh)
    return () => window.removeEventListener("manager-wallet-updated", refresh)
  }, [refresh])

  useEffect(() => {
    if (!apiMode) return
    if (status === "loading" || !isAuthenticated) return
    void loadApi()
  }, [apiMode, status, isAuthenticated, loadApi, tick])

  const summary = useMemo((): ManagerBudgetSummary => {
    if (apiMode) return apiSummary
    void tick
    return ManagerWalletService.getSummary(managerId)
  }, [apiMode, apiSummary, managerId, tick])

  const expenses = useMemo((): ManagerExpenseRecord[] => {
    if (apiMode) return apiExpenses
    void tick
    return ManagerWalletService.getExpenses(managerId)
  }, [apiMode, apiExpenses, managerId, tick])

  const allocations = useMemo((): ManagerBudgetAllocation[] => {
    void tick
    return ManagerWalletService.getAllocations(managerId)
  }, [managerId, tick])

  const createExpense = useCallback(
    async (input: CreateManagerExpenseInput) => {
      if (apiMode) {
        const record = await createStaffExpense(input)
        refresh()
        return record
      }
      return ManagerWalletService.createExpense(managerId, input)
    },
    [apiMode, managerId, refresh],
  )

  return {
    managerId,
    summary,
    expenses,
    allocations,
    loading: apiMode ? loading : false,
    error: apiMode ? error : null,
    refresh: apiMode ? () => void loadApi() : refresh,
    createExpense,
  }
}
