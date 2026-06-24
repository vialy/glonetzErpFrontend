"use client"

import { useCallback, useEffect, useState } from "react"
import { staffMembersService, type StaffMember } from "@/domains/staff"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"

type StaffMembersQuery = {
  members: StaffMember[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useStaffMembersQuery(): StaffMembersQuery {
  const { status, isAuthenticated } = useAuth()
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isApiDataProvider()) {
      if (status === "loading") return
      if (!isAuthenticated) {
        setMembers([])
        setError(null)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const data = await staffMembersService.list()
      setMembers(data)
    } catch (err) {
      setMembers([])
      setError(getApiErrorMessage(err, "Impossible de charger les utilisateurs."))
    } finally {
      setLoading(false)
    }
  }, [status, isAuthenticated])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener("admin-staff-updated", onUpdate)
    return () => window.removeEventListener("admin-staff-updated", onUpdate)
  }, [refresh])

  return { members, loading, error, refresh }
}
