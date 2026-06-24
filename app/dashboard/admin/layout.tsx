"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, isAuthenticated, status } = useAuth()

  useEffect(() => {
    if (status === "loading") return
    if (!isAuthenticated) return
    if (role !== "admin") {
      router.replace("/dashboard")
    }
  }, [status, isAuthenticated, role, router])

  if (status === "loading" || !isAuthenticated || role !== "admin") return null

  return <>{children}</>
}
