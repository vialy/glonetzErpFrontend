"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  HandCoins,
  LayoutDashboard,
  Receipt,
  Sparkles,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { MobileBackButton } from "@/components/mobile-back-button"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { useFinanceContext } from "@/app/dashboard/admin/finances/finance-context"
import {
  financeAccentForPath,
  FinancePremiumPanel,
  type FinanceAccent,
} from "@/components/finances/finance-premium-ui"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"
import { cn } from "@/lib/utils"

type FinanceNavItem = {
  href: string
  labelKey: TranslationKey
  icon: LucideIcon
  accent: FinanceAccent
  exact?: boolean
}

const NAV_ITEMS: FinanceNavItem[] = [
  {
    href: "/dashboard/admin/finances",
    labelKey: "fin_nav_overview",
    icon: LayoutDashboard,
    accent: "violet",
    exact: true,
  },
  {
    href: "/dashboard/admin/finances/comptes-tresorerie",
    labelKey: "fin_nav_treasury",
    icon: Wallet,
    accent: "sky",
  },
  {
    href: "/dashboard/admin/finances/fonds-managers",
    labelKey: "fin_nav_mgr_funds",
    icon: HandCoins,
    accent: "indigo",
  },
  {
    href: "/dashboard/admin/finances/depenses-managers",
    labelKey: "fin_nav_mgr_expenses",
    icon: Receipt,
    accent: "fuchsia",
  },
  {
    href: "/dashboard/admin/finances/depenses-extraordinaires",
    labelKey: "fin_nav_extra",
    icon: TrendingDown,
    accent: "amber",
  },
]

const NAV_ACCENT_ACTIVE: Record<FinanceAccent, string> = {
  violet: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/20",
  sky: "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-900/20",
  indigo: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/20",
  fuchsia: "bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white shadow-lg shadow-fuchsia-900/20",
  amber: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/20",
}

const PERIOD_FILTER_PATHS = new Set([
  "/dashboard/admin/finances/depenses-managers",
  "/dashboard/admin/finances/depenses-extraordinaires",
])

function isActive(pathname: string, item: FinanceNavItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function FinanceModuleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLocale()
  const { periodFilter, setPeriodFilter } = useFinanceContext()
  const showPeriod = PERIOD_FILTER_PATHS.has(pathname)
  const activeItem = NAV_ITEMS.find((item) => isActive(pathname, item))
  const pageAccent = financeAccentForPath(pathname)

  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-8 size-64 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-32 size-56 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/5"
      />

      <MobileBackButton fallbackHref="/dashboard" />

      <header className="relative mb-6 space-y-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)] ring-1 ring-black/[0.03] dark:ring-white/[0.06] sm:p-6",
          )}
        >
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
              pageAccent === "violet" && "from-violet-500 via-fuchsia-500 to-indigo-500",
              pageAccent === "sky" && "from-sky-500 via-cyan-500 to-teal-500",
              pageAccent === "indigo" && "from-indigo-500 via-violet-500 to-sky-500",
              pageAccent === "fuchsia" && "from-fuchsia-500 via-rose-500 to-pink-500",
              pageAccent === "amber" && "from-amber-500 via-orange-500 to-rose-500",
            )}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_50%)]" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                {t("fin_shell_eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-[1.85rem]">
                {activeItem ? t(activeItem.labelKey) : t("fin_title")}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("fin_shell_subtitle")}
              </p>
            </div>
            {showPeriod ? (
              <div className="w-full shrink-0 rounded-2xl border border-border/60 bg-muted/20 p-3 sm:max-w-xs">
                <ManagerPeriodFilter
                  value={periodFilter}
                  onChange={setPeriodFilter}
                  compact
                  hint={t("fin_period_hint")}
                />
              </div>
            ) : null}
          </div>
        </div>

        <nav
          aria-label={t("fin_aside_title")}
          className="w-full max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max max-w-none gap-1.5 rounded-2xl border border-border/60 bg-muted/25 p-1.5 shadow-inner md:inline-flex md:w-auto md:max-w-full md:flex-wrap">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                    active
                      ? NAV_ACCENT_ACTIVE[item.accent]
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-white" : "opacity-70")} />
                  <span className="whitespace-nowrap">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-500">{children}</main>
    </div>
  )
}

export function FinancePanel({
  title,
  description,
  children,
  className,
  accent,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  accent?: FinanceAccent
}) {
  if (title) {
    return (
      <FinancePremiumPanel title={title} description={description} accent={accent ?? "violet"} className={className}>
        {children}
      </FinancePremiumPanel>
    )
  }
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  )
}
