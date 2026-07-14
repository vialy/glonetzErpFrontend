"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Building2, CalendarDays, GraduationCap, Users, Wallet } from "lucide-react"
import { LazyAreaChart } from "@/components/charts/lazy-area-chart"
import { adminExpenses, formatFcfa } from "@/services/admin-mock.service"
import { enrichClassesWithLearnerStats } from "@/domains/classes/enrich-classes"
import { classesService, applyClassStatsToRow, type StaffClassStats } from "@/domains/classes"
import { isApiDataProvider } from "@/lib/data-provider"
import { getCached, hasCached, setCached } from "@/lib/client-cache"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useAdminPaymentsQuery } from "@/hooks/use-admin-payments"
import { useAdminLearnersQuery } from "@/hooks/use-admin-learners"
import { useStaffPaidAggregates } from "@/hooks/use-staff-paid-aggregates"
import { usePendingClaimsCount } from "@/hooks/use-pending-claims-count"
import { useAdminDashboardCharges } from "@/hooks/use-admin-dashboard-charges"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminKpiTile } from "@/components/admin/admin-kpi-tile"
import { DataLoadError } from "@/components/data-load-error"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/hooks/use-locale"
import { computePeriodRange, isIsoDateInPeriod } from "@/lib/manager-period-range"
import { buildDashboardCashflowChart } from "@/lib/dashboard-cashflow-chart"
import { defaultManagerPeriodFilter } from "@/lib/manager-period-range"

function fcfaNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value)
}

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
  const { t, locale } = useLocale()
  const [period, setPeriod] = useState<PeriodId>("last_30")
  const { payments: adminPayments, loading: paymentsLoading, error: paymentsError, refresh: refreshPayments } = useAdminPaymentsQuery()
  const { learners: adminLearners, loading: learnersLoading, error: learnersError, refresh: refreshLearners } = useAdminLearnersQuery()
  const { classes: adminClasses, loading: classesLoading, error: classesError, refresh: refreshClasses } = useAdminClassesQuery()
  const { count: pendingClaims, loading: claimsLoading } = usePendingClaimsCount()
  const [retrying, setRetrying] = useState(false)

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await Promise.all([refreshPayments(), refreshLearners(), refreshClasses()])
    setRetrying(false)
  }, [refreshPayments, refreshLearners, refreshClasses])
  // Encaisse par classe : meme source que la page Classes/Apprenants (paiements reels).
  const { paidByClass } = useStaffPaidAggregates()

  // Rollup financier par classe calcule cote serveur (GET /staff/classes/:id/details) :
  // du / encaisse / reste / effectif / retards. Un appel par classe, en parallele.
  const [statsByClass, setStatsByClass] = useState<Record<string, StaffClassStats>>({})
  const [statsLoading, setStatsLoading] = useState(isApiDataProvider())
  const classIdsKey = useMemo(() => adminClasses.map((c) => c.id).join(","), [adminClasses])

  useEffect(() => {
    if (!isApiDataProvider()) return
    const ids = classIdsKey ? classIdsKey.split(",").filter(Boolean) : []
    if (ids.length === 0) {
      setStatsByClass({})
      setStatsLoading(false)
      return
    }
    let cancelled = false
    // Affichage instantane depuis le cache, puis revalidation en arriere-plan.
    const seeded: Record<string, StaffClassStats> = {}
    for (const id of ids) {
      const c = getCached<StaffClassStats>(`class-stats:${id}`)
      if (c) seeded[id] = c
    }
    if (Object.keys(seeded).length > 0) setStatsByClass((prev) => ({ ...prev, ...seeded }))
    setStatsLoading(!ids.every((id) => hasCached(`class-stats:${id}`)))
    const load = () => {
      Promise.all(
        ids.map((id) =>
          classesService
            .getDetails(id)
            .then((details) => [id, details?.stats ?? null] as const)
            .catch(() => [id, null] as const),
        ),
      ).then((entries) => {
        if (cancelled) return
        const map: Record<string, StaffClassStats> = {}
        for (const [id, stats] of entries) {
          if (stats) {
            map[id] = stats
            setCached(`class-stats:${id}`, stats)
          }
        }
        setStatsByClass(map)
        setStatsLoading(false)
      })
    }
    load()
    window.addEventListener("admin-payments-updated", load)
    return () => {
      cancelled = true
      window.removeEventListener("admin-payments-updated", load)
    }
  }, [classIdsKey])

  // Classes enrichies : en mode API on prend le rollup serveur (source autoritaire),
  // avec repli sur l'enrichissement local si /details indisponible pour une classe.
  const enrichedClasses = useMemo(() => {
    const enriched = enrichClassesWithLearnerStats(adminClasses, adminLearners)
    if (!isApiDataProvider()) return enriched
    return enriched.map((c) => {
      const stats = statsByClass[c.id]
      const fallbackPaid = paidByClass[c.id] ?? 0
      if (!stats) return { ...c, totalPaid: fallbackPaid }
      return applyClassStatsToRow(c, stats, fallbackPaid)
    })
  }, [adminClasses, adminLearners, statsByClass, paidByClass])

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

  // Du global (snapshot, independant de la periode) — somme du attendu de toutes les classes.
  const totalDue = useMemo(() => enrichedClasses.reduce((sum, c) => sum + c.totalDue, 0), [enrichedClasses])
  // Encaisse de la periode selectionnee — base sur les paiements reels (dates).
  const totalPaid = useMemo(() => {
    if (isApiDataProvider()) {
      return adminPayments
        .filter((p) => (p.status === "success" || p.status === "manual") && inRange(p.createdAt))
        .reduce((sum, p) => sum + p.amount, 0)
    }
    return enrichedClasses.reduce((sum, c) => sum + c.totalPaid, 0)
  }, [enrichedClasses, adminPayments, inRange])

  const prevDateRange = useMemo(() => {
    if (!dateRange) return null
    const length = dateRange.end.getTime() - dateRange.start.getTime()
    const end = new Date(dateRange.start.getTime() - 1)
    const start = new Date(end.getTime() - length)
    return { start, end }
  }, [dateRange])

  const dashboardCharges = useAdminDashboardCharges(dateRange, prevDateRange)

  const loading =
    isApiDataProvider() &&
    (paymentsLoading || learnersLoading || classesLoading || statsLoading || dashboardCharges.loading)

  const showError =
    isApiDataProvider() &&
    !loading &&
    Boolean(paymentsError || learnersError || classesError) &&
    adminPayments.length === 0 &&
    adminLearners.length === 0 &&
    adminClasses.length === 0

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

  const companyCharges = isApiDataProvider() ? dashboardCharges.companyCharges : managerOut + extraOut
  const virtualChargesTotal = isApiDataProvider() ? dashboardCharges.virtualChargesTotal : 0
  const totalCharges = companyCharges

  const net = totalPaid - totalCharges
  // En retard = apprenants non entierement payes (etat instantane, pas filtre par periode).
  // En mode API : somme serveur (unpaid + partiellement paye) issue de /details.
  const overdueCount = useMemo(() => {
    if (isApiDataProvider()) {
      return Object.values(statsByClass).reduce(
        (sum, s) => sum + s.unpaidCount + s.partiallyPaidCount,
        0,
      )
    }
    return adminLearners.filter((l) => l.due > 0 && l.paid < l.due).length
  }, [statsByClass, adminLearners])

  const previousMetrics = useMemo(() => {
    const inPrevRange = (iso: string) =>
      prevDateRange ? isIsoDateInPeriod(iso.slice(0, 10), prevDateRange) : false
    const due = enrichedClasses.reduce((sum, c) => sum + c.totalDue, 0)
    const paid = isApiDataProvider()
      ? adminPayments
          .filter((p) => (p.status === "success" || p.status === "manual") && inPrevRange(p.createdAt))
          .reduce((sum, p) => sum + p.amount, 0)
      : enrichedClasses.reduce((sum, c) => sum + c.totalPaid, 0)
    const charges = isApiDataProvider()
      ? dashboardCharges.previousCompanyCharges
      : adminExpenses
          .filter((e) => (e.type === "extra" || e.type === "manager") && inPrevRange(e.createdAt))
          .reduce((sum, e) => sum + e.amount, 0)
    return { due, paid, charges, net: paid - charges }
  }, [enrichedClasses, adminPayments, prevDateRange, dashboardCharges.previousCompanyCharges])

  function deltaPct(current: number, previous: number): number | null {
    if (previous === 0) return null
    return ((current - previous) / Math.abs(previous)) * 100
  }

  const trendData = useMemo(() => {
    if (isApiDataProvider() && dateRange) {
      return buildDashboardCashflowChart({
        range: dateRange,
        payments: adminPayments,
        expenses: dashboardCharges.companyExpensesInPeriod,
        locale,
      })
    }
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
  }, [
    dateRange,
    adminPayments,
    dashboardCharges.companyExpensesInPeriod,
    filteredClasses,
    managerOut,
    extraOut,
    locale,
  ])

  const kpiSeries = useMemo(() => {
    const inSeries = trendData.map((d) => d.in)
    const outSeries = trendData.map((d) => d.out)
    const netSeries = trendData.map((d) => d.in - d.out)
    let running = 0
    const dueSeries = inSeries.map((value) => {
      running += value
      return running
    })
    return { due: dueSeries, in: inSeries, charges: outSeries, net: netSeries }
  }, [trendData])

  if (showError) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpiTile
            categoryLabel={t("adm_treasury_tile_cat_due")}
            categoryHref="/dashboard/admin/classes"
            label={t("adm_treasury_kpi_due")}
            value={fcfaNumber(totalDue)}
            unit="FCFA"
            deltaPct={deltaPct(totalDue, previousMetrics.due)}
            periodLabel={periodLabel}
            series={kpiSeries.due}
            tone="violet"
            loading={loading}
          />
          <AdminKpiTile
            categoryLabel={t("adm_treasury_tile_cat_in")}
            categoryHref="/dashboard/admin/paiements"
            label={t("adm_treasury_kpi_in")}
            value={fcfaNumber(totalPaid)}
            unit="FCFA"
            deltaPct={deltaPct(totalPaid, previousMetrics.paid)}
            periodLabel={periodLabel}
            series={kpiSeries.in}
            tone="sky"
            loading={loading}
          />
          <AdminKpiTile
            categoryLabel={t("adm_treasury_tile_cat_charges")}
            categoryHref="/dashboard/admin/finances"
            label={t("adm_treasury_kpi_charges")}
            value={fcfaNumber(totalCharges)}
            unit="FCFA"
            deltaPct={deltaPct(totalCharges, previousMetrics.charges)}
            periodLabel={periodLabel}
            series={kpiSeries.charges}
            tone="amber"
            invertDelta
            loading={loading}
          />
          <AdminKpiTile
            categoryLabel={t("adm_treasury_tile_cat_net")}
            categoryHref="/dashboard/admin/rapports"
            label={t("adm_treasury_kpi_net")}
            value={fcfaNumber(net)}
            unit="FCFA"
            deltaPct={deltaPct(net, previousMetrics.net)}
            periodLabel={periodLabel}
            series={kpiSeries.net}
            tone={net < 0 ? "rose" : "emerald"}
            loading={loading}
          />
        </div>

        {isApiDataProvider() ? (
          <div className="mt-3 rounded-2xl border border-border/60 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold text-muted-foreground">{t("adm_treasury_virtual_charges_title")}</p>
            {loading ? (
              <Skeleton className="mt-2 h-5 w-40" />
            ) : dashboardCharges.virtualCharges.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("adm_treasury_virtual_charges_empty")}</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {dashboardCharges.virtualCharges.map((row) => (
                  <div key={row.accountId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{row.name}</span>
                    <span className="font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      {formatFcfa(row.total)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2 text-sm">
                  <span className="font-medium">{t("adm_treasury_virtual_charges_total")}</span>
                  <span className="font-bold tabular-nums text-amber-800 dark:text-amber-300">
                    {formatFcfa(dashboardCharges.virtualChargesTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm lg:col-span-2">
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
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : (
                <LazyAreaChart
                  data={trendData}
                  formatValue={formatFcfa}
                  inLabel={t("adm_treasury_kpi_in")}
                  outLabel={t("adm_treasury_kpi_charges")}
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold text-muted-foreground">{t("adm_treasury_claims_wait")}</p>
              {loading || claimsLoading ? (
                <Skeleton className="mt-2 h-7 w-12" />
              ) : (
                <p className="mt-2 text-2xl font-bold tabular-nums">{pendingClaims}</p>
              )}
              <Link
                href="/dashboard/reclamations-validation"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-90"
              >
                {t("adm_treasury_claims_open")} <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold text-muted-foreground">{t("adm_treasury_overdue")}</p>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-12" />
              ) : (
                <p className="mt-2 text-2xl font-bold tabular-nums">{overdueCount}</p>
              )}
              <Link
                href="/dashboard/admin/apprenants"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-90"
              >
                {t("adm_treasury_overdue_link")} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-tight">{t("adm_treasury_class_title")}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("adm_treasury_class_sub")}</p>
              </div>
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
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={`sk-${i}`} className="border-t">
                          {Array.from({ length: 5 }).map((__, j) => (
                            <td key={j} className="px-3 py-2">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : enrichedClasses.map((cls) => {
                    const dueExpected = cls.totalDueExpected ?? cls.totalDue
                    const rest = cls.totalRemaining ?? Math.max(0, dueExpected - cls.totalPaid)
                    const ratio =
                      cls.totalPaid > 0 && dueExpected > 0
                        ? Math.max(1, Math.round((cls.totalPaid / dueExpected) * 100))
                        : 0
                    return (
                      <tr key={cls.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{cls.name}</td>
                        <td className="px-3 py-2">{formatFcfa(dueExpected)}</td>
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
