"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileBarChart,
  LayoutGrid,
  ListTree,
  Scale,
} from "lucide-react"
import { accountingAuditService } from "@/domains/accounting"
import type { AuditDateRange, AuditFinancialSummary } from "@/domains/accounting/types"
import { defaultAuditDateRange, formatFcfa } from "@/lib/audit-date-range"
import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountantDashboard() {
  const { t } = useLocale()
  const [range, setRange] = useState<AuditDateRange>(() => defaultAuditDateRange())
  const [summary, setSummary] = useState<AuditFinancialSummary | null>(null)

  useEffect(() => {
    setSummary(accountingAuditService.getSummary(range))
  }, [range])

  const cards = useMemo(() => {
    if (!summary) return []
    return [
      {
        key: "in",
        label: t("acc_card_payments_in"),
        value: formatFcfa(summary.totalPaymentsIn),
        sub: `${summary.paymentCount} ${t("acc_operations")}`,
        icon: <ArrowDownLeft className="size-5 text-emerald-600" />,
        tone: "border-emerald-500/20 bg-emerald-500/[0.06]",
      },
      {
        key: "mgr",
        label: t("acc_card_manager_expenses"),
        value: formatFcfa(summary.totalManagerExpenses),
        sub: `${summary.managerExpenseCount} ${t("acc_lines")}`,
        icon: <ArrowUpRight className="size-5 text-amber-600" />,
        tone: "border-amber-500/20 bg-amber-500/[0.06]",
      },
      {
        key: "ext",
        label: t("acc_card_extraordinary"),
        value: formatFcfa(summary.totalExtraordinaryExpenses),
        sub: `${summary.extraordinaryCount} ${t("acc_lines")}`,
        icon: <Scale className="size-5 text-orange-600" />,
        tone: "border-orange-500/20 bg-orange-500/[0.06]",
      },
      {
        key: "net",
        label: t("acc_card_net"),
        value: formatFcfa(summary.theoreticalNetBalance),
        sub: t("acc_card_net_hint"),
        icon: <ListTree className="size-5 text-primary" />,
        tone: "border-primary/25 bg-primary/5",
      },
    ]
  }, [summary, t])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:px-6 md:pb-10">
      <header className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Eye className="size-3.5" />
          {t("acc_readonly_badge")}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{t("acc_dashboard_title")}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("acc_dashboard_subtitle")}</p>
      </header>

      <section className="mb-8 rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("acc_period_filter")}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-from" className="text-xs">
                {t("acc_date_from")}
              </Label>
              <Input
                id="acc-from"
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-to" className="text-xs">
                {t("acc_date_to")}
              </Label>
              <Input
                id="acc-to"
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-11 shrink-0"
            onClick={() => setRange(defaultAuditDateRange())}
          >
            {t("acc_reset_period")}
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!summary
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="flex flex-col rounded-2xl border border-border/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))
          : cards.map((c) => (
              <div
                key={c.key}
                className={`flex flex-col rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${c.tone}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  <span className="rounded-lg bg-background/80 p-1.5 shadow-sm">{c.icon}</span>
                </div>
                <p className="text-lg font-semibold tabular-nums tracking-tight">{c.value}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-snug">{c.sub}</p>
              </div>
            ))}
      </div>

      <nav className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t("acc_quick_nav_aria")}>
        <Link
          href="/dashboard/comptable/flux"
          className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:bg-muted/30"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutGrid className="size-5" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold">{t("acc_link_flow_title")}</span>
            <span className="block text-xs text-muted-foreground">{t("acc_link_flow_desc")}</span>
          </span>
        </Link>
        <Link
          href="/dashboard/comptable/reclamations"
          className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:bg-muted/30"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Eye className="size-5" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold">{t("acc_link_claims_title")}</span>
            <span className="block text-xs text-muted-foreground">{t("acc_link_claims_desc")}</span>
          </span>
        </Link>
        <Link
          href="/dashboard/comptable/rapports"
          className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:bg-muted/30 sm:col-span-1"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileBarChart className="size-5" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold">{t("acc_link_reports_title")}</span>
            <span className="block text-xs text-muted-foreground">{t("acc_link_reports_desc")}</span>
          </span>
        </Link>
      </nav>
    </div>
  )
}
