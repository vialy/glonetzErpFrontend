"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, Building2, CalendarDays, CreditCard, GraduationCap, TrendingUp, Users, Wallet } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { adminExpenses, formatFcfa } from "@/services/admin-mock.service"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { useAdminPayments } from "@/hooks/use-admin-payments"
import { useAdminLearners } from "@/hooks/use-admin-learners"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { useLocale } from "@/hooks/use-locale"
import { computePeriodRange, isIsoDateInPeriod } from "@/lib/manager-period-range"
import { defaultManagerPeriodFilter } from "@/lib/manager-period-range"

type PeriodId =
  | "today"
  | "yesterday"
  | "last_7"
  | "last_30"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"

export function TreasuryContent() {
  const { t } = useLocale()
  const [period, setPeriod] = useState<PeriodId>("last_30")
  const adminPayments = useAdminPayments()
  const adminLearners = useAdminLearners()
  const adminClasses = useAdminClasses()

  const dateRange = useMemo(() => {
    // Filtre admin : préréglages uniquement (pas de "custom" ici).
    return computePeriodRange({ ...defaultManagerPeriodFilter(), preset: period })
  }, [period])

  function inRange(isoOrYmdish: string) {
    if (!dateRange) return true
    // createdAt peut être "YYYY-MM-DD HH:mm" ; on prend juste la date.
    const ymd = isoOrYmdish.slice(0, 10)
    return isIsoDateInPeriod(ymd, dateRange)
  }

  const periodOptions = useMemo(
    () =>
      [
        { id: "today" as const, label: t("mgr_period_today") },
        { id: "yesterday" as const, label: t("mgr_period_yesterday") },
        { id: "last_7" as const, label: t("mgr_period_last_7") },
        { id: "last_30" as const, label: t("mgr_period_last_30") },
        { id: "this_week" as const, label: t("mgr_period_this_week") },
        { id: "last_week" as const, label: t("mgr_period_last_week") },
        { id: "this_month" as const, label: t("mgr_period_this_month") },
        { id: "last_month" as const, label: t("mgr_period_last_month") },
        { id: "this_year" as const, label: t("mgr_period_this_year") },
        { id: "last_year" as const, label: t("mgr_period_last_year") },
      ] as const,
    [t],
  )

  const periodLabel = periodOptions.find((p) => p.id === period)?.label ?? ""

  const filteredClasses = useMemo(() => {
    if (!dateRange) return adminClasses
    const rs = dateRange.start.getTime()
    const re = dateRange.end.getTime()
    return adminClasses.filter((cls) => {
      const cs = new Date(cls.periodStart).getTime()
      const ce = new Date(cls.periodEnd).getTime()
      return cs <= re && ce >= rs
    })
  }, [adminClasses, dateRange])

  const totalDue = useMemo(() => filteredClasses.reduce((sum, item) => sum + item.totalDue, 0), [filteredClasses])
  const totalPaid = useMemo(() => filteredClasses.reduce((sum, item) => sum + item.totalPaid, 0), [filteredClasses])

  const filteredManagerExpenses = useMemo(
    () => adminExpenses.filter((e) => e.type === "manager" && inRange(e.createdAt)),
    [inRange]
  )
  const filteredExtraExpenses = useMemo(
    () => adminExpenses.filter((e) => e.type === "extra" && inRange(e.createdAt)),
    [inRange]
  )

  const managerOut = useMemo(() => filteredManagerExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredManagerExpenses])
  const extraOut = useMemo(() => filteredExtraExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExtraExpenses])

  const net = totalPaid - managerOut - extraOut
  const pendingClaims = useMemo(
    () => adminPayments.filter((p) => p.status !== "success" && inRange(p.createdAt)).length,
    [adminPayments, inRange]
  )
  const overdueLearners = useMemo(
    () => adminLearners.filter((l) => l.paid < l.due && inRange(l.createdAt)).map((l) => l.id),
    [adminLearners, inRange]
  )

  const paidPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0
  const paidHint =
    totalDue > 0 ? `${paidPct}% ${t("adm_treasury_kpi_paid_hint")}` : "—"
  const chargesHint = `${t("adm_treasury_kpi_charges_hint")} ${formatFcfa(managerOut)} + ${t("adm_treasury_kpi_extra")} ${formatFcfa(extraOut)}`

  const trendData = useMemo(() => {
    if (filteredClasses.length === 0) return []
    const baseOut = [42000, 35000, 180000, 95000, 60000]
    const outTotalFiltered = managerOut + extraOut
    const baseOutSum = baseOut.reduce((s, x) => s + x, 0) || 1
    const outFactor = outTotalFiltered / baseOutSum

    const labels = filteredClasses[0]?.chartData.map((p) => p.label) ?? []
    return labels.map((_label, idx) => {
      const inSum = filteredClasses.reduce((sum, cls) => sum + (cls.chartData[idx]?.paid ?? 0), 0)
      const out = Math.round((baseOut[idx] ?? 50000) * outFactor)
      return { label: labels[idx]!, in: inSum, out }
    })
  }, [filteredClasses, managerOut, extraOut])

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <AdminPageHeader
          title={t("adm_treasury_title")}
          subtitle={t("adm_treasury_subtitle")}
          gradientClassName="from-primary to-accent"
          actions={
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-primary-foreground/12 px-3 py-2 text-xs font-semibold text-primary-foreground/95 backdrop-blur-sm">
                <CalendarDays className="size-3.5" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodId)}
                  className="bg-transparent outline-none text-primary-foreground/95"
                >
                  {periodOptions.map((p) => (
                    <option key={p.id} value={p.id} className="text-foreground">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                href="/dashboard/admin/rapports"
                className="inline-flex items-center gap-1 rounded-2xl bg-primary-foreground px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:brightness-95"
              >
                {t("adm_treasury_reports")} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          }
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            label={t("adm_treasury_kpi_due")}
            value={formatFcfa(totalDue)}
            icon={<Wallet className="size-4" />}
            tone="violet"
            featured
          />
          <AdminKpiCard
            label={t("adm_treasury_kpi_in")}
            value={formatFcfa(totalPaid)}
            hint={paidHint}
            icon={<TrendingUp className="size-4" />}
            tone="success"
          />
          <AdminKpiCard
            label={t("adm_treasury_kpi_charges")}
            value={formatFcfa(managerOut + extraOut)}
            hint={chargesHint}
            icon={<CreditCard className="size-4" />}
            tone="warning"
          />
          <AdminKpiCard
            label={t("adm_treasury_kpi_net")}
            value={formatFcfa(net)}
            icon={<AlertTriangle className="size-4" />}
            tone={net < 0 ? "danger" : "violet"}
            featured={net >= 0}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight">{t("adm_treasury_chart_title")} ({periodLabel})</h3>
              <span className="text-xs text-muted-foreground">{t("adm_treasury_chart_sub")}</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500/80" />
                {t("adm_treasury_kpi_in")}
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500/80" />
                {t("adm_treasury_kpi_charges")}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="admin-in" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="admin-out" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatFcfa(value)} />
                  <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} fill="url(#admin-in)" />
                  <Area type="monotone" dataKey="out" stroke="#f59e0b" strokeWidth={2} fill="url(#admin-out)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold text-muted-foreground">{t("adm_treasury_claims_wait")}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{pendingClaims}</p>
              <Link
                href="/dashboard/reclamations-validation"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-90"
              >
                {t("adm_treasury_claims_open")} <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold text-muted-foreground">{t("adm_treasury_overdue")}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{overdueLearners.length}</p>
              <Link
                href="/dashboard/admin/apprenants"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-90"
              >
                {t("adm_treasury_overdue_link")} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight">{t("adm_treasury_class_title")}</h3>
              <Link href="/dashboard/admin/classes" className="text-xs font-semibold text-primary transition hover:opacity-90">
                {t("adm_treasury_all_classes")}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("adm_treasury_th_class")}</th>
                    <th className="px-3 py-2">{t("adm_treasury_th_due")}</th>
                    <th className="px-3 py-2">{t("adm_treasury_th_paid")}</th>
                    <th className="px-3 py-2">{t("adm_treasury_th_left")}</th>
                    <th className="px-3 py-2">{t("adm_treasury_th_progress")}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminClasses.map((cls) => {
                    const rest = cls.totalDue - cls.totalPaid
                    const ratio = cls.totalDue > 0 ? Math.round((cls.totalPaid / cls.totalDue) * 100) : 0
                    return (
                      <tr key={cls.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{cls.name}</td>
                        <td className="px-3 py-2">{formatFcfa(cls.totalDue)}</td>
                        <td className="px-3 py-2">{formatFcfa(cls.totalPaid)}</td>
                        <td className="px-3 py-2">{formatFcfa(rest)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${Math.min(100, ratio)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{ratio}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
            <h3 className="text-base font-semibold tracking-tight">{t("adm_treasury_quick_title")}</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <Link
                href="/dashboard/admin/classes/nouvelle"
                className="group flex items-center gap-3 rounded-xl border bg-muted/10 px-3 py-2.5 hover:bg-muted/30 transition"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{t("adm_treasury_q1")}</span>
                <ArrowRight className="size-4 text-muted-foreground opacity-70 transition group-hover:opacity-100" />
              </Link>
              <Link
                href="/dashboard/admin/apprenants"
                className="group flex items-center gap-3 rounded-xl border bg-muted/10 px-3 py-2.5 hover:bg-muted/30 transition"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{t("adm_treasury_q2")}</span>
                <ArrowRight className="size-4 text-muted-foreground opacity-70 transition group-hover:opacity-100" />
              </Link>
              <Link
                href="/dashboard/admin/finances"
                className="group flex items-center gap-3 rounded-xl border bg-muted/10 px-3 py-2.5 hover:bg-muted/30 transition"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{t("adm_treasury_q3")}</span>
                <ArrowRight className="size-4 text-muted-foreground opacity-70 transition group-hover:opacity-100" />
              </Link>
              <Link
                href="/dashboard/admin/utilisateurs"
                className="group flex items-center gap-3 rounded-xl border bg-muted/10 px-3 py-2.5 hover:bg-muted/30 transition"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{t("adm_treasury_q4")}</span>
                <ArrowRight className="size-4 text-muted-foreground opacity-70 transition group-hover:opacity-100" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
