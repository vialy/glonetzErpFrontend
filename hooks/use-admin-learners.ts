"use client"

import { useEffect, useState } from "react"
import { getAdminLearners, type AdminLearner } from "@/services/admin-mock.service"

export function useAdminLearners(): AdminLearner[] {
  const [list, setList] = useState<AdminLearner[]>(() =>
    typeof window !== "undefined" ? getAdminLearners() : [],
  )

  useEffect(() => {
    setList(getAdminLearners())
    const refresh = () => setList(getAdminLearners())
    window.addEventListener("admin-learners-updated", refresh)
    return () => window.removeEventListener("admin-learners-updated", refresh)
  }, [])

  return list
}
