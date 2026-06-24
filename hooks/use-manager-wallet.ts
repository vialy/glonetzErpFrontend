"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ManagerWalletService } from "@/domains/manager-wallet"
import type { ManagerBudgetAllocation, ManagerBudgetSummary, ManagerExpenseRecord } from "@/domains/manager-wallet/types"
import { authService } from "@/domains/auth"
import { resolveManagerIdByPhone } from "@/lib/resolve-manager-id"

export function useManagerWalletId(): string {
  const session = authService.getSession()
  if (session?.staffUserId) return session.staffUserId
  return resolveManagerIdByPhone(session?.phone)
}

export function useManagerWallet() {
  const managerId = useManagerWalletId()
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    window.addEventListener("manager-wallet-updated", refresh)
    return () => window.removeEventListener("manager-wallet-updated", refresh)
  }, [refresh])

  const summary = useMemo((): ManagerBudgetSummary => {
    void tick
    return ManagerWalletService.getSummary(managerId)
  }, [managerId, tick])

  const expenses = useMemo((): ManagerExpenseRecord[] => {
    void tick
    return ManagerWalletService.getExpenses(managerId)
  }, [managerId, tick])

  const allocations = useMemo((): ManagerBudgetAllocation[] => {
    void tick
    return ManagerWalletService.getAllocations(managerId)
  }, [managerId, tick])

  return {
    managerId,
    summary,
    expenses,
    allocations,
    refresh,
    createExpense: (input: Parameters<typeof ManagerWalletService.createExpense>[1]) =>
      ManagerWalletService.createExpense(managerId, input),
  }
}
