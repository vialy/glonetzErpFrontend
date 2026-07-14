"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { CreateManagerExpenseInput, ManagerBudgetSummary, ManagerExpenseRecord } from "@/domains/manager-wallet/types"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import {
  fetchTreasuryWallets,
  STAFF_ACCOUNTS_UPDATED_EVENT,
  type StaffAccount,
} from "@/services/staff-accounts.service"
import {
  createStaffExpense,
  EXPENSES_UPDATED_EVENT,
  fetchExtraordinaryExpenses,
} from "@/services/staff-expenses.service"

const EMPTY_SUMMARY: ManagerBudgetSummary = {
  envelopeCeiling: 0,
  totalSpent: 0,
  remaining: 0,
  currencyCode: "XAF",
}

export function useAdminExtraordinaryWallet() {
  const apiMode = isApiDataProvider()
  const { status, isAuthenticated } = useAuth()
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(apiMode)
  const [error, setError] = useState<string | null>(null)
  const [treasuryWallets, setTreasuryWallets] = useState<StaffAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [expenses, setExpenses] = useState<ManagerExpenseRecord[]>([])

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const selectedAccount = useMemo(
    () => treasuryWallets.find((w) => w.accountId === selectedAccountId) ?? null,
    [treasuryWallets, selectedAccountId],
  )

  const loadApi = useCallback(async () => {
    if (!apiMode) return
    setLoading(true)
    setError(null)
    try {
      const wallets = await fetchTreasuryWallets()
      setTreasuryWallets(wallets)
      setSelectedAccountId((prev) => {
        if (prev && wallets.some((w) => w.accountId === prev)) return prev
        const company = wallets.find((w) => w.type === "company")
        return company?.accountId ?? wallets[0]?.accountId ?? ""
      })
      const rows = await fetchExtraordinaryExpenses()
      setExpenses(rows)
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible de charger les dépenses extraordinaires."))
      setTreasuryWallets([])
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [apiMode])

  useEffect(() => {
    if (!apiMode) return
    const onUpdated = () => refresh()
    window.addEventListener(EXPENSES_UPDATED_EVENT, onUpdated)
    window.addEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(EXPENSES_UPDATED_EVENT, onUpdated)
      window.removeEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, onUpdated)
    }
  }, [apiMode, refresh])

  useEffect(() => {
    if (!apiMode) return
    if (status === "loading" || !isAuthenticated) return
    void loadApi()
  }, [apiMode, status, isAuthenticated, loadApi, tick])

  const accountExpenses = useMemo(() => {
    if (!selectedAccountId) return expenses
    return expenses.filter((e) => e.accountId === selectedAccountId)
  }, [expenses, selectedAccountId])

  const summary = useMemo((): ManagerBudgetSummary => {
    if (!apiMode) return EMPTY_SUMMARY
    const totalSpent = accountExpenses.reduce((sum, e) => sum + e.amount, 0)
    const remaining = selectedAccount?.balance ?? 0
    return {
      envelopeCeiling: remaining + totalSpent,
      totalSpent,
      remaining,
      currencyCode: selectedAccount?.currencyCode ?? "XAF",
    }
  }, [apiMode, accountExpenses, selectedAccount])

  const createExpense = useCallback(
    async (input: CreateManagerExpenseInput) => {
      if (!apiMode) throw new Error("API_ONLY")
      const record = await createStaffExpense({
        ...input,
        accountId: (input.accountId ?? selectedAccountId) || undefined,
      })
      refresh()
      return record
    },
    [apiMode, refresh, selectedAccountId],
  )

  return {
    apiMode,
    summary,
    expenses: accountExpenses,
    allExpenses: expenses,
    treasuryWallets,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    companyAccount: treasuryWallets.find((w) => w.type === "company") ?? null,
    loading: apiMode ? loading : false,
    error: apiMode ? error : null,
    refresh: apiMode ? () => void loadApi() : refresh,
    createExpense,
  }
}
