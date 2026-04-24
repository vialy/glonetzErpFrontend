"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function ComptableLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return
    if (role !== "accountant") {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, role, router])

  if (!isAuthenticated) return null
  if (role !== "accountant") return null

  return <>{children}</>
}
