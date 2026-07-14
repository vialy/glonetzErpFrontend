"use client"

import { useMemo } from "react"
import { useFinanceContext } from "@/app/dashboard/admin/finances/finance-context"
import { useStaffAccounts } from "@/hooks/use-staff-accounts"
import { isApiDataProvider } from "@/lib/data-provider"

export type FinanceConsolidatedBalances = {
  loading: boolean
  companyBalance: number
  withManagers: number
  totalConsolidated: number
  managersRemaining: number
  virtualWalletsTotal: number
}

export function useFinanceConsolidatedBalances(): FinanceConsolidatedBalances {
  const apiMode = isApiDataProvider()
  const { wallets, managerWalletSnapshots, managerRemainingReal } = useFinanceContext()
  const { accounts, loading } = useStaffAccounts()

  return useMemo(() => {
    if (apiMode) {
      const companyBalance = accounts.find((a) => a.type === "company" && a.isActive)?.balance ?? 0
      const managersRemaining = accounts
        .filter((a) => a.type === "staff" && a.isActive && a.owner?.role === "manager")
        .reduce((sum, a) => sum + a.balance, 0)
      const virtualWalletsTotal = accounts
        .filter((a) => a.type === "virtual" && a.isActive)
        .reduce((sum, a) => sum + a.balance, 0)

      return {
        loading,
        companyBalance,
        withManagers: companyBalance + managersRemaining,
        totalConsolidated: companyBalance + managersRemaining + virtualWalletsTotal,
        managersRemaining,
        virtualWalletsTotal,
      }
    }

    const companyBalance = wallets
      .filter((w) => w.type === "tuition")
      .reduce((sum, w) => sum + w.currentBalance, 0)
    const managersRemaining =
      managerWalletSnapshots.length > 0
        ? managerWalletSnapshots.reduce((sum, m) => sum + m.remaining, 0)
        : managerRemainingReal
    const virtualWalletsTotal = wallets
      .filter((w) => w.type === "other")
      .reduce((sum, w) => sum + w.currentBalance, 0)

    return {
      loading: false,
      companyBalance,
      withManagers: companyBalance + managersRemaining,
      totalConsolidated: companyBalance + managersRemaining + virtualWalletsTotal,
      managersRemaining,
      virtualWalletsTotal,
    }
  }, [apiMode, accounts, loading, wallets, managerWalletSnapshots, managerRemainingReal])
}
