"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return
    if (role !== "manager") {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, role, router])

  if (!isAuthenticated) return null
  if (role !== "manager") return null

  return <>{children}</>
}
