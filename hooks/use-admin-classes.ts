"use client"

import { useCallback, useEffect, useState } from "react"
import { classesService, type StaffClass } from "@/domains/classes"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import { clearCached, getCached, hasCached, setCached } from "@/lib/client-cache"
import { getAdminClasses, type AdminClass } from "@/services/admin-mock.service"

const CACHE_KEY = "admin-classes"

type AdminClassesQuery = {
  classes: AdminClass[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAdminClassesQuery(): AdminClassesQuery {
  const { status, isAuthenticated } = useAuth()
  const [classes, setClasses] = useState<StaffClass[]>(() => {
    if (typeof window === "undefined") return []
    if (!isApiDataProvider()) return getAdminClasses()
    return getCached<StaffClass[]>(CACHE_KEY) ?? []
  })
  // On n'affiche le skeleton que si aucune donnee n'est encore en cache.
  const [loading, setLoading] = useState(() => isApiDataProvider() && !hasCached(CACHE_KEY))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isApiDataProvider()) {
      if (status === "loading") return
      if (!isAuthenticated) {
        setClasses([])
        clearCached(CACHE_KEY)
        setError(null)
        setLoading(false)
        return
      }

      // Revalidation silencieuse si on a deja des donnees en cache.
      if (!hasCached(CACHE_KEY)) setLoading(true)
      setError(null)
      try {
        const data = await classesService.list()
        setClasses(data)
        setCached(CACHE_KEY, data)
      } catch (err) {
        if (!hasCached(CACHE_KEY)) setClasses([])
        setError(getApiErrorMessage(err, "Impossible de charger les classes."))
      } finally {
        setLoading(false)
      }
      return
    }

    setClasses(getAdminClasses())
    setError(null)
    setLoading(false)
  }, [status, isAuthenticated])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener("admin-classes-updated", onUpdate)
    return () => window.removeEventListener("admin-classes-updated", onUpdate)
  }, [refresh])

  return { classes, loading, error, refresh }
}

export function useAdminClasses(): AdminClass[] {
  return useAdminClassesQuery().classes
}
