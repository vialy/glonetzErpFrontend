"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, isAuthenticated, status } = useAuth()

  useEffect(() => {
    if (status === "loading") return
    if (!isAuthenticated) return
    if (role !== "manager") {
      router.replace("/dashboard")
    }
  }, [status, isAuthenticated, role, router])

  if (status === "loading" || !isAuthenticated || role !== "manager") return null

  return <>{children}</>
}
