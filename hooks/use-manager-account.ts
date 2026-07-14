"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { isApiDataProvider } from "@/lib/data-provider"
import {
  fetchAccountStatement,
  fetchMyAccount,
  STAFF_ACCOUNTS_UPDATED_EVENT,
  type StaffAccount,
  type StatementEntry,
} from "@/services/staff-accounts.service"

/**
 * Charge le compte de trésorerie du staff connecté (solde + relevé) en mode API.
 * Le solde provient de /staff/accounts/me ; les mouvements de /staff/accounts/statement.
 */
export function useManagerAccount() {
  const { status, isAuthenticated } = useAuth()
  const [account, setAccount] = useState<StaffAccount | null>(null)
  const [entries, setEntries] = useState<StatementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [me, statement] = await Promise.all([fetchMyAccount(), fetchAccountStatement()])
      setAccount(me ?? statement.account)
      setEntries(statement.entries)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isApiDataProvider()) {
      setLoading(false)
      return
    }
    if (status === "loading" || !isAuthenticated) return
    void load()
    const onUpdated = () => void load()
    window.addEventListener("manager-wallet-updated", onUpdated)
    window.addEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener("manager-wallet-updated", onUpdated)
      window.removeEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, onUpdated)
    }
  }, [status, isAuthenticated, load])

  return { account, entries, loading, error, refresh: load }
}
