"use client"

import { useEffect, useState } from "react"
import { getAdminClasses, type AdminClass } from "@/services/admin-mock.service"

export function useAdminClasses(): AdminClass[] {
  const [list, setList] = useState<AdminClass[]>(() =>
    typeof window !== "undefined" ? getAdminClasses() : [],
  )

  useEffect(() => {
    setList(getAdminClasses())
    const refresh = () => setList(getAdminClasses())
    window.addEventListener("admin-classes-updated", refresh)
    return () => window.removeEventListener("admin-classes-updated", refresh)
  }, [])

  return list
}
