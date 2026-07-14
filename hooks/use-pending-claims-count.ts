"use client"

import { useCallback, useEffect, useState } from "react"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { isApiDataProvider } from "@/lib/data-provider"
import { fetchStaffClaims } from "@/services/staff-claims.service"

export function isPendingClaimStatus(status: ClaimRecord["status"]) {
  return status === "en_attente" || status === "en_cours"
}

export function countPendingClaims(claims: ClaimRecord[]) {
  return claims.filter((c) => isPendingClaimStatus(c.status)).length
}

async function fetchClaimsForCount(): Promise<ClaimRecord[]> {
  if (isApiDataProvider()) {
    return fetchStaffClaims({ status: "pending" })
  }
  return claimsService.getAll()
}

export function usePendingClaimsCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const claims = await fetchClaimsForCount()
      setCount(countPendingClaims(claims))
    } catch {
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener("claims-updated", onUpdate)
    return () => window.removeEventListener("claims-updated", onUpdate)
  }, [refresh])

  return { count, loading, refresh }
}
