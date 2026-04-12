"use client"

import { useAuth } from "@/hooks/use-auth"
import { TreasuryContent } from "@/components/treasury-content"
import { StudentDashboard } from "@/components/student-dashboard"
import { AccountantDashboard } from "@/components/accountant-dashboard"
import { ManagerDashboard } from "@/components/manager-dashboard"

export default function DashboardPage() {
  const { role } = useAuth()

  if (role === "student") {
    return <StudentDashboard />
  }

  if (role === "accountant") {
    return <AccountantDashboard />
  }

  if (role === "manager") {
    return <ManagerDashboard />
  }

  return <TreasuryContent />
}
