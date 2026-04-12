"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Wallet, HandCoins, BarChart3, CreditCard, TrendingDown } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { formatFcfa } from "@/services/admin-mock.service"
import { FinanceProvider, useFinanceContext } from "./finance-context"

function FinanceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { inflowTotal, managerOut, extraOut, totalBalance } = useFinanceContext()

  const links = [
    { href: "/dashboard/admin/finances/comptes-tresorerie", label: "Comptes tresorerie", icon: Wallet },
    { href: "/dashboard/admin/finances/affectation-manager", label: "Affectation manager", icon: HandCoins },
    { href: "/dashboard/admin/finances/paiements-managers", label: "Paiements managers", icon: CreditCard },
    { href: "/dashboard/admin/finances/depenses-extraordinaires", label: "Depenses extraordinaires", icon: TrendingDown },
    { href: "/dashboard/admin/finances/vue-consolidee", label: "Vue consolidee", icon: BarChart3 },
  ]

  return (
    <div className="px-3 pb-24 pt-3 md:px-6 md:pb-10 lg:px-8">
      <AdminPageHeader
        title="Finances"
        subtitle="Gestion structuree des portefeuilles et operations financieres."
        gradientClassName="from-emerald-600 to-sky-600"
      />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Encaissements totaux" value={formatFcfa(inflowTotal)} />
        <AdminKpiCard label="Depenses manager" value={formatFcfa(managerOut)} />
        <AdminKpiCard label="Depenses extra" value={formatFcfa(extraOut)} />
        <AdminKpiCard label="Solde global" value={formatFcfa(totalBalance)} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section>{children}</section>
        <aside className="rounded-xl border bg-card p-2.5 lg:sticky lg:top-4 lg:h-fit">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dashboard finance</p>
          <p className="px-2 pb-2 text-xs text-muted-foreground">Ouvre une section</p>
          <div className="space-y-1">
            {links.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <FinanceProvider>
      <FinanceShell>{children}</FinanceShell>
    </FinanceProvider>
  )
}
