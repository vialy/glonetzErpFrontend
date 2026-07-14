"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ManagerExpenseRecord } from "@/domains/manager-wallet/types"
import { isApiDataProvider } from "@/lib/data-provider"
import { isIsoDateInPeriod } from "@/lib/manager-period-range"
import {
  fetchTreasuryWallets,
  STAFF_ACCOUNTS_UPDATED_EVENT,
  type StaffAccount,
} from "@/services/staff-accounts.service"
import {
  EXPENSES_UPDATED_EVENT,
  fetchStaffExpenses,
} from "@/services/staff-expenses.service"
import {
  fetchStaffWithdrawals,
  WITHDRAWALS_UPDATED_EVENT,
  type StaffWithdrawalRecord,
} from "@/services/staff-withdrawals.service"

export type VirtualWalletCharges = {
  accountId: string
  name: string
  total: number
}

export type CompanyChargeOutflow = {
  spentAt: string
  amount: number
  description: string
  categoryLabel?: string
}

function sumExpensesInPeriod(
  expenses: ManagerExpenseRecord[],
  range: { start: Date; end: Date } | null,
  match: (expense: ManagerExpenseRecord) => boolean,
): number {
  return expenses
    .filter((e) => {
      if (!match(e)) return false
      if (!range) return true
      return isIsoDateInPeriod(e.spentAt.slice(0, 10), range)
    })
    .reduce((sum, e) => sum + e.amount, 0)
}

function isCompanyExpense(expense: ManagerExpenseRecord): boolean {
  return expense.accountType === "company"
}

function isAllocationExpense(expense: ManagerExpenseRecord): boolean {
  return expense.categoryId === "manager_allocation"
}

function sumSuccessfulWithdrawalsInPeriod(
  withdrawals: StaffWithdrawalRecord[],
  range: { start: Date; end: Date } | null,
): number {
  return withdrawals
    .filter((w) => {
      if (w.status !== "successful") return false
      if (!range) return true
      return isIsoDateInPeriod(w.createdAt.slice(0, 10), range)
    })
    .reduce((sum, w) => sum + w.amount, 0)
}

export function useAdminDashboardCharges(
  dateRange: { start: Date; end: Date } | null,
  prevDateRange: { start: Date; end: Date } | null,
) {
  const apiMode = isApiDataProvider()
  const [loading, setLoading] = useState(apiMode)
  const [treasuryWallets, setTreasuryWallets] = useState<StaffAccount[]>([])
  const [expenses, setExpenses] = useState<ManagerExpenseRecord[]>([])
  const [withdrawals, setWithdrawals] = useState<StaffWithdrawalRecord[]>([])

  const load = useCallback(async () => {
    if (!apiMode) return
    setLoading(true)
    try {
      const [wallets, rows, payoutRows] = await Promise.all([
        fetchTreasuryWallets(),
        fetchStaffExpenses(),
        fetchStaffWithdrawals(),
      ])
      setTreasuryWallets(wallets)
      setExpenses(rows)
      setWithdrawals(payoutRows)
    } catch {
      setTreasuryWallets([])
      setExpenses([])
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }, [apiMode])

  useEffect(() => {
    if (!apiMode) return
    void load()
    const refresh = () => void load()
    window.addEventListener(EXPENSES_UPDATED_EVENT, refresh)
    window.addEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, refresh)
    window.addEventListener(WITHDRAWALS_UPDATED_EVENT, refresh)
    return () => {
      window.removeEventListener(EXPENSES_UPDATED_EVENT, refresh)
      window.removeEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, refresh)
      window.removeEventListener(WITHDRAWALS_UPDATED_EVENT, refresh)
    }
  }, [apiMode, load])

  const companyAccount = useMemo(
    () => treasuryWallets.find((w) => w.type === "company") ?? null,
    [treasuryWallets],
  )

  const virtualWallets = useMemo(
    () => treasuryWallets.filter((w) => w.type === "virtual"),
    [treasuryWallets],
  )

  const matchesVirtual = useCallback(
    (e: ManagerExpenseRecord, wallet: StaffAccount) => {
      if (e.accountId) return e.accountId === wallet.accountId
      return e.accountType === "virtual" && e.accountName === wallet.name
    },
    [],
  )

  /** Dépenses société confirmées + allocations manager réussies uniquement. */
  const companyCharges = useMemo(() => {
    const extraordinary = sumExpensesInPeriod(
      expenses,
      dateRange,
      (e) => isCompanyExpense(e) && !isAllocationExpense(e),
    )
    const allocations = sumSuccessfulWithdrawalsInPeriod(withdrawals, dateRange)
    return extraordinary + allocations
  }, [expenses, withdrawals, dateRange])

  const previousCompanyCharges = useMemo(() => {
    const extraordinary = sumExpensesInPeriod(
      expenses,
      prevDateRange,
      (e) => isCompanyExpense(e) && !isAllocationExpense(e),
    )
    const allocations = sumSuccessfulWithdrawalsInPeriod(withdrawals, prevDateRange)
    return extraordinary + allocations
  }, [expenses, withdrawals, prevDateRange])

  const virtualCharges = useMemo((): VirtualWalletCharges[] => {
    return virtualWallets
      .map((wallet) => ({
        accountId: wallet.accountId,
        name: wallet.name,
        total: sumExpensesInPeriod(expenses, dateRange, (e) => matchesVirtual(e, wallet)),
      }))
      .filter((row) => row.total > 0)
  }, [virtualWallets, expenses, dateRange, matchesVirtual])

  const virtualChargesTotal = useMemo(
    () => virtualCharges.reduce((sum, row) => sum + row.total, 0),
    [virtualCharges],
  )

  const companyChargeOutflows = useMemo((): CompanyChargeOutflow[] => {
    const extraordinary = expenses
      .filter((e) => {
        if (!isCompanyExpense(e) || isAllocationExpense(e)) return false
        if (!dateRange) return true
        return isIsoDateInPeriod(e.spentAt.slice(0, 10), dateRange)
      })
      .map((e) => ({
        spentAt: e.spentAt,
        amount: e.amount,
        description: e.categoryLabel || e.comment || e.id,
        categoryLabel: e.categoryLabel,
      }))

    const allocations = withdrawals
      .filter((w) => {
        if (w.status !== "successful") return false
        if (!dateRange) return true
        return isIsoDateInPeriod(w.createdAt.slice(0, 10), dateRange)
      })
      .map((w) => ({
        spentAt: w.createdAt,
        amount: w.amount,
        description: `Allocation manager — ${w.beneficiaryName ?? w.beneficiaryStaffId ?? w.id}`,
        categoryLabel: "Allocation manager",
      }))

    return [...extraordinary, ...allocations].sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
  }, [expenses, withdrawals, dateRange])

  const companyExpensesInPeriod = useMemo(
    () =>
      companyChargeOutflows.map((e) => ({
        spentAt: e.spentAt,
        amount: e.amount,
      })),
    [companyChargeOutflows],
  )

  return {
    apiMode,
    loading: apiMode ? loading : false,
    companyCharges,
    previousCompanyCharges,
    virtualCharges,
    virtualChargesTotal,
    companyChargeOutflows,
    companyExpensesInPeriod,
    companyAccountName: companyAccount?.name,
  }
}
