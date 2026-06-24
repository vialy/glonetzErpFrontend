"use client"

import Link from "next/link"
import {
  AlertCircle,
  ChevronRight,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Home,
  PlusCircle,
  UserCircle2,
  Wallet,
} from "lucide-react"
import { useManagerWallet } from "@/hooks/use-manager-wallet"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function ManagerDashboard() {
  const { t } = useLocale()
  const { summary } = useManagerWallet()

  const spentPct =
    summary && summary.envelopeCeiling > 0
      ? Math.min(100, Math.round((summary.totalSpent / summary.envelopeCeiling) * 100))
      : 0

  return (
    <div className="mx-auto w-full max-w-none px-4 py-6 pb-28 md:px-6 md:pb-10">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg">
        <div className="p-5 md:p-6">
          <nav className="flex items-center gap-1 text-xs text-primary-foreground/75">
            <Home className="size-3.5" />
            <ChevronRight className="size-3" />
            <span>{t("mgr_dashboard_title")}</span>
          </nav>
          <h1 className="mt-2 text-xl font-bold tracking-tight md:text-2xl text-balance">{t("mgr_dashboard_title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-foreground/90">{t("mgr_dashboard_subtitle")}</p>
          {summary?.periodHint ? (
            <p className="mt-3 inline-flex rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
              {t("mgr_period")}: {summary.periodHint}
            </p>
          ) : null}
        </div>
        <div className="bg-black/10 px-5 py-3 md:px-6">
          <div className="flex items-center justify-between text-xs text-primary-foreground/90">
            <span>{t("mgr_budget_bar_used")}</span>
            <span>{spentPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${spentPct}%` }} />
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{t("mgr_card_budget")}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{formatFcfa(summary.envelopeCeiling)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{t("mgr_card_spent")}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {formatFcfa(summary.totalSpent)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{t("mgr_card_remaining")}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-400">
              {formatFcfa(summary.remaining)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-28" />
            </div>
          ))}
        </div>
      )}

      <nav className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label={t("nav_mgr_section")}>
        <MgrLink
          href="/dashboard/manager/apprenants"
          title={t("mgr_nav_learners")}
          desc={t("mgr_learn_subtitle")}
          icon={<GraduationCap className="size-5" />}
          highlight
        />
        <MgrLink
          href="/dashboard/manager/paiements"
          title={t("mgr_nav_payments")}
          desc={t("mgr_payments_subtitle")}
          icon={<CreditCard className="size-5" />}
        />
        <MgrLink
          href="/dashboard/reclamations-validation"
          title={t("mgr_nav_claims_val")}
          desc={t("reclam_subtitle_mgr")}
          icon={<AlertCircle className="size-5" />}
        />
        <MgrLink
          href="/dashboard/manager/depenses/nouvelle"
          title={t("mgr_quick_new")}
          desc={t("mgr_quick_new_desc")}
          icon={<PlusCircle className="size-5" />}
        />
        <MgrLink
          href="/dashboard/manager/depenses"
          title={t("mgr_quick_list")}
          desc={t("mgr_quick_list_desc")}
          icon={<ClipboardList className="size-5" />}
        />
        <MgrLink
          href="/dashboard/manager/budget"
          title={t("mgr_quick_budget")}
          desc={t("mgr_quick_budget_desc")}
          icon={<Wallet className="size-5" />}
        />
        <MgrLink
          href="/dashboard/manager/profil"
          title={t("mgr_quick_profile")}
          desc={t("mgr_quick_profile_desc")}
          icon={<UserCircle2 className="size-5" />}
        />
      </nav>
    </div>
  )
}

function MgrLink({
  href,
  title,
  desc,
  icon,
  highlight,
}: {
  href: string
  title: string
  desc: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[4.75rem] items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-sm transition-all active:scale-[0.99]",
        highlight
          ? "border-primary/40 bg-primary/5 hover:border-primary/55 hover:bg-primary/10"
          : "border-border/70 bg-card hover:border-primary/25 hover:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          highlight ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "bg-muted text-foreground"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground leading-snug">{desc}</span>
      </span>
      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
    </Link>
  )
}
