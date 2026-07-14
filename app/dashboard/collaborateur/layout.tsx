"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function CollaborateurLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, isAuthenticated, status } = useAuth()

  useEffect(() => {
    if (status === "loading") return
    if (!isAuthenticated) return
    if (role !== "collaborateur") {
      router.replace("/dashboard")
    }
  }, [status, isAuthenticated, role, router])

  if (status === "loading" || !isAuthenticated || role !== "collaborateur") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return <>{children}</>
}
