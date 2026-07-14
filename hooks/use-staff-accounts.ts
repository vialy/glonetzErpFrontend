"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { isApiDataProvider } from "@/lib/data-provider"
import { fetchAllAccounts, STAFF_ACCOUNTS_UPDATED_EVENT, type StaffAccountWithOwner } from "@/services/staff-accounts.service"

/**
 * Liste de tous les comptes (société + staff) via GET /staff/accounts (admin).
 * Ne charge qu'en mode API. Se rafraîchit après un transfert.
 */
export function useStaffAccounts() {
  const { status, isAuthenticated } = useAuth()
  const [accounts, setAccounts] = useState<StaffAccountWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await fetchAllAccounts())
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

  return { accounts, loading, error, refresh: load }
}
