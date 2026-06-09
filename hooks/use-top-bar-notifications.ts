"use client"

import { useEffect, useMemo, useState } from "react"
import { ClaimsService } from "@/services/claims.service"
import { getAdminPayments } from "@/services/admin-mock.service"
import { getNotificationDefsForRole } from "@/lib/top-bar-nav"
import type { UserRole } from "@/types"

function countPendingClaims() {
  return ClaimsService.getAll().filter((c) => c.status === "en_attente" || c.status === "en_cours").length
}

function countPendingPayments() {
  return getAdminPayments().filter((p) => p.status === "pending").length
}

export function useTopBarNotifications(role: UserRole | null) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1)
    window.addEventListener("claims-updated", refresh)
    window.addEventListener("admin-payments-updated", refresh)
    return () => {
      window.removeEventListener("claims-updated", refresh)
      window.removeEventListener("admin-payments-updated", refresh)
    }
  }, [])

  return useMemo(() => {
    const pendingClaims = role === "admin" || role === "manager" ? countPendingClaims() : 0
    const pendingPayments = role === "admin" ? countPendingPayments() : 0
    const items = getNotificationDefsForRole(role, { pendingClaims, pendingPayments })
    const totalBadge = items.reduce((sum, item) => sum + item.count, 0)
    return { items, totalBadge, pendingClaims, pendingPayments }
  }, [role, tick])
}
