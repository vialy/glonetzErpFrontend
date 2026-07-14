"use client"

import type { ReactNode } from "react"
import { FinanceProvider } from "./finance-context"
import { FinanceModuleShell } from "@/components/finances/finance-module-shell"

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <FinanceProvider>
      <FinanceModuleShell>{children}</FinanceModuleShell>
    </FinanceProvider>
  )
}
