"use client"

import { useEffect, useMemo, useState } from "react"
import { getAdminPayments } from "@/services/admin-mock.service"
import { getNotificationDefsForRole } from "@/lib/top-bar-nav"
import { usePendingClaimsCount } from "@/hooks/use-pending-claims-count"
import type { UserRole } from "@/types"

function countPendingPayments() {
  return getAdminPayments().filter((p) => p.status === "pending").length
}

export function useTopBarNotifications(role: UserRole | null) {
  const { count: pendingClaimsFromApi, refresh: refreshClaims } = usePendingClaimsCount()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setTick((n) => n + 1)
      void refreshClaims()
    }
    window.addEventListener("claims-updated", refresh)
    window.addEventListener("admin-payments-updated", refresh)
    return () => {
      window.removeEventListener("claims-updated", refresh)
      window.removeEventListener("admin-payments-updated", refresh)
    }
  }, [refreshClaims])

  return useMemo(() => {
    const pendingClaims = role === "admin" || role === "manager" ? pendingClaimsFromApi : 0
    const pendingPayments = role === "admin" ? countPendingPayments() : 0
    const items = getNotificationDefsForRole(role, { pendingClaims, pendingPayments })
    const totalBadge = items.reduce((sum, item) => sum + item.count, 0)
    return { items, totalBadge, pendingClaims, pendingPayments }
  }, [role, tick, pendingClaimsFromApi])
}
