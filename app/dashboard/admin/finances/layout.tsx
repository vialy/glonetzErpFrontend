"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Wallet, HandCoins, BarChart3, CreditCard, TrendingDown, PiggyBank, CircleDollarSign } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { formatFcfa } from "@/services/admin-mock.service"
import { FinanceProvider, useFinanceContext } from "./finance-context"
import { useLocale } from "@/hooks/use-locale"

function FinanceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { t } = useLocale()
  const {
    inflowTotal,
    managerOut,
    extraOut,
    managerRemainingReal,
    consolidatedTheoretical,
    consolidatedRealRemaining,
    periodFilter,
    setPeriodFilter,
    filteredOperationCount,
  } = useFinanceContext()

  const links = [
    { href: "/dashboard/admin/finances/comptes-tresorerie", label: t("fin_nav_treasury"), icon: Wallet },
    { href: "/dashboard/admin/finances/affectation-manager", label: t("fin_nav_mgr"), icon: HandCoins },
    { href: "/dashboard/admin/finances/paiements-managers", label: t("fin_nav_mgr_pay"), icon: CreditCard },
    { href: "/dashboard/admin/finances/depenses-extraordinaires", label: t("fin_nav_extra"), icon: TrendingDown },
    { href: "/dashboard/admin/finances/vue-consolidee", label: t("fin_nav_consolidated"), icon: BarChart3 },
  ]

  return (
    <div className="px-3 pb-24 pt-3 md:px-6 md:pb-10 lg:px-8">
      <AdminPageHeader
        title={t("fin_title")}
        subtitle={t("fin_subtitle")}
        gradientClassName="from-emerald-600 to-sky-600"
        className="relative z-20 !overflow-visible"
        actions={
          <ManagerPeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            compact
            className="min-w-[220px] max-w-[280px] border-white/20 bg-white/10 p-1.5 text-black [&_p]:text-black/80 [&_label]:text-black [&_button]:text-black [&_input]:h-10 [&_input]:border-white/30 [&_input]:bg-white [&_input]:text-black [&_input]:shadow-none [&_[data-slot='select-trigger']]:h-10 [&_[data-slot='select-trigger']]:min-h-10 [&_[data-slot='select-trigger']]:border-white/30 [&_[data-slot='select-trigger']]:bg-white [&_[data-slot='select-trigger']]:text-black [&_[role='combobox']]:text-black"
          />
        }
      />
      <div className="mt-3 rounded-2xl border bg-card/85 p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AdminKpiCard
            label={t("fin_kpi_theoretical")}
            value={formatFcfa(consolidatedTheoretical)}
            icon={<CircleDollarSign className="size-5" />}
            tone="violet"
            featured
          />
          <AdminKpiCard
            label={t("fin_kpi_real")}
            value={formatFcfa(consolidatedRealRemaining)}
            icon={<PiggyBank className="size-5" />}
            tone="success"
            featured
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("fin_kpi_in")}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatFcfa(inflowTotal)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("fin_kpi_mgr")}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatFcfa(managerOut)}</p>
          </div>
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.06] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("fin_kpi_extra")}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatFcfa(extraOut)}</p>
          </div>
          <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.06] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("fin_kpi_mgr_remaining")}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatFcfa(managerRemainingReal)}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section>{children}</section>
        <aside className="rounded-xl border bg-card p-2.5 lg:sticky lg:top-4 lg:h-fit">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("fin_aside_title")}</p>
          <p className="px-2 pb-2 text-xs text-muted-foreground">{t("fin_aside_sub")}</p>
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
