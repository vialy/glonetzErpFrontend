"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  fetchActiveScholarships,
  type ActiveScholarshipRecord,
} from "@/services/scholarships.service"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import { clearCached, getCached, hasCached, setCached } from "@/lib/client-cache"

const CACHE_KEY = "admin-active-scholarships"

export function computeNetTuition(catalogFee: number, scholarship?: ActiveScholarshipRecord | null): number {
  if (!scholarship || catalogFee <= 0) return catalogFee
  if (scholarship.type === "full" || scholarship.isFull) return 0
  if (scholarship.type === "fixed") return Math.max(0, catalogFee - scholarship.value)
  if (scholarship.type === "percentage") {
    const pct = Math.min(100, Math.max(scholarship.value, 0))
    return Math.max(0, catalogFee - (catalogFee * pct) / 100)
  }
  return catalogFee
}

export function useActiveScholarshipsQuery(): {
  scholarships: ActiveScholarshipRecord[]
  scholarshipByUser: Record<string, ActiveScholarshipRecord>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const { status, isAuthenticated } = useAuth()
  const [list, setList] = useState<ActiveScholarshipRecord[]>(() => {
    if (typeof window === "undefined" || !isApiDataProvider()) return []
    return getCached<ActiveScholarshipRecord[]>(CACHE_KEY) ?? []
  })
  const [loading, setLoading] = useState(() => isApiDataProvider() && !hasCached(CACHE_KEY))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isApiDataProvider()) {
      setList([])
      setError(null)
      setLoading(false)
      return
    }
    if (status === "loading") return
    if (!isAuthenticated) {
      setList([])
      clearCached(CACHE_KEY)
      setError(null)
      setLoading(false)
      return
    }

    if (!hasCached(CACHE_KEY)) setLoading(true)
    setError(null)
    try {
      const items = await fetchActiveScholarships()
      setList(items)
      setCached(CACHE_KEY, items)
    } catch (err) {
      if (!hasCached(CACHE_KEY)) setList([])
      setError(getApiErrorMessage(err, "Impossible de charger les bourses."))
    } finally {
      setLoading(false)
    }
  }, [status, isAuthenticated])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener("admin-scholarships-updated", onUpdate)
    return () => window.removeEventListener("admin-scholarships-updated", onUpdate)
  }, [refresh])

  const scholarshipByUser = useMemo(() => {
    const map: Record<string, ActiveScholarshipRecord> = {}
    for (const row of list) map[row.userId] = row
    return map
  }, [list])

  return { scholarships: list, scholarshipByUser, loading, error, refresh }
}
