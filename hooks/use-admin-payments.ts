"use client"

import { useEffect, useState } from "react"
import { getAdminPayments, type AdminPaymentItem } from "@/services/admin-mock.service"

export function useAdminPayments(): AdminPaymentItem[] {
  const [list, setList] = useState<AdminPaymentItem[]>(() =>
    typeof window !== "undefined" ? getAdminPayments() : [],
  )

  useEffect(() => {
    setList(getAdminPayments())
    const refresh = () => setList(getAdminPayments())
    window.addEventListener("admin-payments-updated", refresh)
    return () => window.removeEventListener("admin-payments-updated", refresh)
  }, [])

  return list
}
