"use client"

import { useCallback, useEffect, useState } from "react"
import { learnersService, type StaffLearner } from "@/domains/learners"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import { clearCached, getCached, hasCached, setCached } from "@/lib/client-cache"
import { getAdminLearners, type AdminLearner } from "@/services/admin-mock.service"

const CACHE_KEY = "admin-learners"

type AdminLearnersQuery = {
  learners: AdminLearner[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAdminLearnersQuery(): AdminLearnersQuery {
  const { status, isAuthenticated } = useAuth()
  const [learners, setLearners] = useState<StaffLearner[]>(() => {
    if (typeof window === "undefined") return []
    if (!isApiDataProvider()) return getAdminLearners()
    return getCached<StaffLearner[]>(CACHE_KEY) ?? []
  })
  // On n'affiche le skeleton que si aucune donnee n'est encore en cache.
  const [loading, setLoading] = useState(() => isApiDataProvider() && !hasCached(CACHE_KEY))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isApiDataProvider()) {
      if (status === "loading") return
      if (!isAuthenticated) {
        setLearners([])
        clearCached(CACHE_KEY)
        setError(null)
        setLoading(false)
        return
      }

      // Revalidation silencieuse si on a deja des donnees en cache.
      if (!hasCached(CACHE_KEY)) setLoading(true)
      setError(null)
      try {
        const data = await learnersService.list()
        setLearners(data)
        setCached(CACHE_KEY, data)
      } catch (err) {
        if (!hasCached(CACHE_KEY)) setLearners([])
        setError(getApiErrorMessage(err, "Impossible de charger les apprenants."))
      } finally {
        setLoading(false)
      }
      return
    }

    setLearners(getAdminLearners())
    setError(null)
    setLoading(false)
  }, [status, isAuthenticated])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener("admin-learners-updated", onUpdate)
    return () => window.removeEventListener("admin-learners-updated", onUpdate)
  }, [refresh])

  return { learners, loading, error, refresh }
}

export function useAdminLearners(): AdminLearner[] {
  return useAdminLearnersQuery().learners
}
