"use client"

import { useCallback, useEffect, useState } from "react"
import { getAdminPayments, type AdminPaymentItem } from "@/services/admin-mock.service"
import { fetchStaffPayments } from "@/services/staff-payments.service"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import { clearCached, getCached, hasCached, setCached } from "@/lib/client-cache"

const CACHE_KEY = "admin-payments"

type AdminPaymentsQuery = {
  payments: AdminPaymentItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAdminPaymentsQuery(): AdminPaymentsQuery {
  const { status, isAuthenticated } = useAuth()
  const [list, setList] = useState<AdminPaymentItem[]>(() => {
    if (typeof window === "undefined") return []
    if (!isApiDataProvider()) return getAdminPayments()
    return getCached<AdminPaymentItem[]>(CACHE_KEY) ?? []
  })
  // En mode API : skeleton seulement si rien n'est encore en cache.
  const [loading, setLoading] = useState(() => isApiDataProvider() && !hasCached(CACHE_KEY))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isApiDataProvider()) {
      if (status === "loading") return
      if (!isAuthenticated) {
        setList([])
        clearCached(CACHE_KEY)
        setError(null)
        setLoading(false)
        return
      }

      // Revalidation silencieuse si on a deja des donnees en cache.
      if (!hasCached(CACHE_KEY)) setLoading(true)
      setError(null)
      try {
        const items = await fetchStaffPayments()
        setList(items)
        setCached(CACHE_KEY, items)
      } catch (err) {
        if (!hasCached(CACHE_KEY)) setList([])
        setError(getApiErrorMessage(err, "Impossible de charger les paiements."))
      } finally {
        setLoading(false)
      }
      return
    }

    // Mode mock : donnees locales (synchrones).
    setList(getAdminPayments())
    setError(null)
    setLoading(false)
  }, [status, isAuthenticated])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener("admin-payments-updated", onUpdate)
    return () => window.removeEventListener("admin-payments-updated", onUpdate)
  }, [refresh])

  return { payments: list, loading, error, refresh }
}

export function useAdminPayments(): AdminPaymentItem[] {
  return useAdminPaymentsQuery().payments
}
