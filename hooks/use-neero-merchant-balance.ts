"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { isApiDataProvider } from "@/lib/data-provider"
import {
  fetchNeeroMerchantBalance,
  type NeeroMerchantBalanceSnapshot,
} from "@/services/staff-accounts.service"

export function useNeeroMerchantBalance() {
  const apiMode = isApiDataProvider()
  const { status, isAuthenticated } = useAuth()
  const [data, setData] = useState<NeeroMerchantBalanceSnapshot | null>(null)
  const [loading, setLoading] = useState(apiMode)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!apiMode) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const snapshot = await fetchNeeroMerchantBalance()
      setData(snapshot)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Erreur Neero")
    } finally {
      setLoading(false)
    }
  }, [apiMode])

  useEffect(() => {
    if (!apiMode || status === "loading" || !isAuthenticated) return
    void reload()
  }, [apiMode, status, isAuthenticated, reload])

  return { data, loading, error, reload, apiMode }
}
