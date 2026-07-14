"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import type { WithdrawalAccountRecord } from "@/domains/withdrawal-accounts/types"
import {
  fetchMyWithdrawalAccounts,
  WITHDRAWAL_ACCOUNTS_UPDATED_EVENT,
} from "@/services/staff-withdrawal-accounts.service"

export function useWithdrawalAccounts() {
  const { status, isAuthenticated } = useAuth()
  const [accounts, setAccounts] = useState<WithdrawalAccountRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await fetchMyWithdrawalAccounts())
    } catch (e) {
      setError(e)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "loading" || !isAuthenticated) return
    void load()
    const onUpdated = () => void load()
    window.addEventListener(WITHDRAWAL_ACCOUNTS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(WITHDRAWAL_ACCOUNTS_UPDATED_EVENT, onUpdated)
  }, [status, isAuthenticated, load])

  const neeroAccounts = accounts.filter((a) => a.provider === "neero")

  return {
    accounts,
    neeroAccounts,
    loading,
    error,
    refresh: load,
  }
}
