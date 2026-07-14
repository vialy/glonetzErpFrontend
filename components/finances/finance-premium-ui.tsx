"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type FinanceAccent = "violet" | "sky" | "indigo" | "fuchsia" | "amber"

const ACCENT = {
  violet: {
    bar: "from-violet-500 via-fuchsia-500 to-indigo-500",
    card: "border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-violet-50/40 to-background dark:from-violet-500/10 dark:via-violet-950/30 dark:to-card",
    icon: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    glow: "shadow-[0_20px_50px_-20px_rgba(139,92,246,0.45)]",
    progress: "from-violet-500 via-fuchsia-500 to-indigo-500",
    progressTrack: "bg-violet-700/10",
    nav: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/25",
    panel: "from-violet-600 via-fuchsia-600 to-indigo-600",
    value: "text-foreground",
  },
  sky: {
    bar: "from-sky-500 via-cyan-500 to-teal-500",
    card: "border-sky-500/20 bg-gradient-to-br from-sky-500/15 via-sky-50/40 to-background dark:from-sky-500/10 dark:via-sky-950/30 dark:to-card",
    icon: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    glow: "shadow-[0_20px_50px_-20px_rgba(14,165,233,0.45)]",
    progress: "from-sky-500 via-cyan-500 to-teal-500",
    progressTrack: "bg-sky-700/10",
    nav: "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-900/25",
    panel: "from-sky-600 via-cyan-600 to-teal-600",
    value: "text-foreground",
  },
  indigo: {
    bar: "from-indigo-500 via-violet-500 to-sky-500",
    card: "border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-indigo-50/40 to-background dark:from-indigo-500/10 dark:via-indigo-950/30 dark:to-card",
    icon: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    glow: "shadow-[0_20px_50px_-20px_rgba(99,102,241,0.45)]",
    progress: "from-indigo-500 via-violet-500 to-sky-500",
    progressTrack: "bg-indigo-700/10",
    nav: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/25",
    panel: "from-indigo-600 via-violet-600 to-sky-600",
    value: "text-foreground",
  },
  fuchsia: {
    bar: "from-fuchsia-500 via-rose-500 to-pink-500",
    card: "border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/15 via-fuchsia-50/40 to-background dark:from-fuchsia-500/10 dark:via-fuchsia-950/30 dark:to-card",
    icon: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
    glow: "shadow-[0_20px_50px_-20px_rgba(217,70,239,0.4)]",
    progress: "from-fuchsia-500 via-rose-500 to-pink-500",
    progressTrack: "bg-fuchsia-700/10",
    nav: "bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white shadow-lg shadow-fuchsia-900/25",
    panel: "from-fuchsia-600 via-rose-600 to-pink-600",
    value: "text-foreground",
  },
  amber: {
    bar: "from-amber-500 via-orange-500 to-rose-500",
    card: "border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-amber-50/40 to-background dark:from-amber-500/10 dark:via-amber-950/30 dark:to-card",
    icon: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    glow: "shadow-[0_20px_50px_-20px_rgba(245,158,11,0.4)]",
    progress: "from-amber-500 via-orange-500 to-rose-500",
    progressTrack: "bg-amber-700/10",
    nav: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/25",
    panel: "from-amber-600 via-orange-600 to-rose-600",
    value: "text-amber-900 dark:text-amber-100",
  },
} as const

export function financeAccentForPath(pathname: string): FinanceAccent {
  if (pathname.startsWith("/dashboard/admin/finances/comptes-tresorerie")) return "sky"
  if (pathname.startsWith("/dashboard/admin/finances/fonds-managers")) return "indigo"
  if (pathname.startsWith("/dashboard/admin/finances/depenses-managers")) return "fuchsia"
  if (pathname.startsWith("/dashboard/admin/finances/depenses-extraordinaires")) return "amber"
  return "violet"
}

export function FinanceStatCard({
  label,
  value,
  hint,
  icon,
  accent = "violet",
  progress,
  featured = false,
  valueClassName,
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
  accent?: FinanceAccent
  progress?: number
  featured?: boolean
  valueClassName?: string
}) {
  const s = ACCENT[accent]
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        s.card,
        featured && s.glow,
        featured ? "p-5" : "p-4",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", s.bar)} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        {icon ? <span className={cn("inline-flex shrink-0 rounded-xl p-2", s.icon)}>{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-2 tabular-nums font-extrabold leading-none",
          featured ? "text-[1.75rem]" : "text-[1.45rem]",
          s.value,
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {progress !== undefined ? (
        <div className={cn("mt-3 h-1.5 overflow-hidden rounded-full", s.progressTrack)}>
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", s.progress)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : featured ? (
        <div className={cn("mt-3 h-1.5 overflow-hidden rounded-full", s.progressTrack)}>
          <div className={cn("h-full w-full rounded-full bg-gradient-to-r", s.progress)} />
        </div>
      ) : null}
    </article>
  )
}

export function FinanceQuickLinkCard({
  href,
  title,
  description,
  icon: Icon,
  accent = "violet",
}: {
  href: string
  title: string
  description: string
  icon: LucideIcon
  accent?: FinanceAccent
}) {
  const s = ACCENT[accent]
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        s.card,
        s.glow,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80", s.bar)} />
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", s.icon)}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold tracking-tight text-foreground">{title}</span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
        </span>
      </div>
    </Link>
  )
}

export function FinancePremiumPanel({
  title,
  description,
  accent = "violet",
  children,
  className,
}: {
  title?: string
  description?: string
  accent?: FinanceAccent
  children: React.ReactNode
  className?: string
}) {
  const s = ACCENT[accent]
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_48px_-28px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.03] dark:ring-white/[0.06]",
        className,
      )}
    >
      {title ? (
        <div className={cn("relative px-4 py-4 text-white sm:px-5 sm:py-5", `bg-gradient-to-r ${s.panel}`)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
          <div className="relative">
            <h2 className="text-sm font-bold tracking-tight sm:text-base">{title}</h2>
            {description ? <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/85 sm:text-sm">{description}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function FinanceSectionTabs({
  tabs,
}: {
  tabs: Array<{ href: string; label: string; active: boolean; accent?: FinanceAccent }>
}) {
  return (
    <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-muted/30 p-1.5 shadow-inner">
      {tabs.map((tab) => {
        const s = ACCENT[tab.accent ?? "indigo"]
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-all duration-200",
              tab.active ? s.nav : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
            )}
          >
            {tab.label}
          </a>
        )
      })}
    </div>
  )
}

export function FinanceFilterCard({
  accent = "violet",
  children,
}: {
  accent?: FinanceAccent
  children: React.ReactNode
}) {
  const s = ACCENT[accent]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        s.card,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", s.bar)} />
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}
