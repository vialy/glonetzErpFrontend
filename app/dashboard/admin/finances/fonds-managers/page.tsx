"use client"

import { Suspense } from "react"
import { ManagerFundsPage } from "@/components/finances/manager-funds-page"

export default function FondsManagersPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted/40" />}>
      <ManagerFundsPage />
    </Suspense>
  )
}
