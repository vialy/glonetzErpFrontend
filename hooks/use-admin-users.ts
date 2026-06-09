"use client"

import { useEffect, useState } from "react"
import { getAdminUsers, type AdminUserItem } from "@/services/admin-mock.service"

export function useAdminUsers(): AdminUserItem[] {
  const [list, setList] = useState<AdminUserItem[]>(() =>
    typeof window !== "undefined" ? getAdminUsers() : [],
  )

  useEffect(() => {
    setList(getAdminUsers())
    const refresh = () => setList(getAdminUsers())
    window.addEventListener("admin-users-updated", refresh)
    return () => window.removeEventListener("admin-users-updated", refresh)
  }, [])

  return list
}
