"use client"

import { useEffect, useState } from "react"
import { getAdminPayments, type AdminPaymentItem } from "@/services/admin-mock.service"
import { fetchStaffPayments } from "@/services/staff-payments.service"
import { isApiDataProvider } from "@/lib/data-provider"
import { getCached, hasCached, setCached } from "@/lib/client-cache"

const CACHE_KEY = "admin-payments"

export function useAdminPaymentsQuery(): { payments: AdminPaymentItem[]; loading: boolean } {
  const [list, setList] = useState<AdminPaymentItem[]>(() => {
    if (typeof window === "undefined") return []
    if (!isApiDataProvider()) return getAdminPayments()
    return getCached<AdminPaymentItem[]>(CACHE_KEY) ?? []
  })
  // En mode API : skeleton seulement si rien n'est encore en cache.
  const [loading, setLoading] = useState(isApiDataProvider() && !hasCached(CACHE_KEY))

  useEffect(() => {
    // Mode API : on charge les paiements reels depuis le backend (GET /staff/payments).
    if (isApiDataProvider()) {
      let cancelled = false
      const load = () => {
        fetchStaffPayments()
          .then((items) => {
            if (cancelled) return
            setList(items)
            setCached(CACHE_KEY, items)
          })
          .catch(() => {
            if (!cancelled && !hasCached(CACHE_KEY)) setList([])
          })
          .finally(() => {
            if (!cancelled) setLoading(false)
          })
      }
      load()
      window.addEventListener("admin-payments-updated", load)
      return () => {
        cancelled = true
        window.removeEventListener("admin-payments-updated", load)
      }
    }

    // Mode mock : donnees locales (synchrones).
    setList(getAdminPayments())
    setLoading(false)
    const refresh = () => setList(getAdminPayments())
    window.addEventListener("admin-payments-updated", refresh)
    return () => window.removeEventListener("admin-payments-updated", refresh)
  }, [])

  return { payments: list, loading }
}

export function useAdminPayments(): AdminPaymentItem[] {
  return useAdminPaymentsQuery().payments
}
