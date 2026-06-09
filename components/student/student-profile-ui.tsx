"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProfileSectionHeader({
  icon,
  title,
  description,
  action,
  variant = "default",
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  variant?: "default" | "dark"
}) {
  const isDark = variant === "dark"

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-lg",
            isDark
              ? "bg-white/10 text-emerald-300 ring-1 ring-white/15"
              : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/25",
          )}
        >
          {icon}
        </span>
        <div>
          <h2
            className={cn(
              "text-base font-semibold tracking-tight md:text-lg",
              isDark ? "text-white" : "text-foreground",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className={cn("mt-0.5 text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function PremiumProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn("relative h-3 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/50", className)}>
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-violet-500 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
    </div>
  )
}

export function ProfilePremiumCard({
  children,
  className,
  accent = "primary",
}: {
  children: ReactNode
  className?: string
  accent?: "primary" | "emerald" | "none"
}) {
  const accentLine =
    accent === "emerald"
      ? "from-emerald-500 via-teal-500 to-cyan-400"
      : accent === "primary"
        ? "from-primary via-violet-500 to-accent"
        : null

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
        className,
      )}
    >
      {accentLine ? <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", accentLine)} /> : null}
      <div className="pointer-events-none absolute -right-24 -top-24 size-48 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative">{children}</div>
    </section>
  )
}

export function QuickActionTile({
  href,
  title,
  description,
  icon,
  variant = "primary",
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
  variant?: "primary" | "outline"
}) {
  const isPrimary = variant === "primary"

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-1 min-w-[min(100%,220px)] flex-col gap-3 overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        isPrimary
          ? "border-primary/25 bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
          : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
          isPrimary ? "bg-white/15 ring-1 ring-white/20" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>
      <div>
        <p className={cn("font-semibold", isPrimary ? "text-white" : "text-foreground")}>{title}</p>
        <p className={cn("mt-1 text-xs leading-relaxed", isPrimary ? "text-white/80" : "text-muted-foreground")}>
          {description}
        </p>
      </div>
      <ChevronRight
        className={cn(
          "absolute right-4 top-1/2 size-5 -translate-y-1/2 opacity-0 transition-all group-hover:right-3 group-hover:opacity-100",
          isPrimary ? "text-white/90" : "text-primary",
        )}
      />
    </Link>
  )
}

export function IdentityField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-gradient-to-br from-muted/30 to-transparent px-4 py-3.5 backdrop-blur-sm",
        className,
      )}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-sm font-semibold tracking-tight text-foreground md:text-base">{value}</dd>
    </div>
  )
}
