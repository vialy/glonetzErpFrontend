"use client"

import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/use-auth"

const TreasuryContent = dynamic(
  () => import("@/components/treasury-content").then((m) => m.TreasuryContent),
  { loading: () => <DashboardSkeleton /> },
)

const AccountantDashboard = dynamic(
  () => import("@/components/accountant-dashboard").then((m) => m.AccountantDashboard),
  { loading: () => <DashboardSkeleton /> },
)

const ManagerDashboard = dynamic(
  () => import("@/components/manager-dashboard").then((m) => m.ManagerDashboard),
  { loading: () => <DashboardSkeleton /> },
)

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 md:p-6">
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-muted" />
    </div>
  )
}

export default function DashboardPage() {
  const { role } = useAuth()

  if (role === "accountant") {
    return <AccountantDashboard />
  }

  if (role === "manager") {
    return <ManagerDashboard />
  }

  return <TreasuryContent />
}
