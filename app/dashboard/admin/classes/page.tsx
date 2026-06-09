"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  Filter,
  CalendarDays,
  GraduationCap,
  Pencil,
  Plus,
  School,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  RotateCcw,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { type AdminClassStatus } from "@/services/admin-mock.service"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { useLocale } from "@/hooks/use-locale"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { ClassSearchSelect } from "@/components/admin/class-search-select"
import { MobileBackButton } from "@/components/mobile-back-button"

function classOverlapsDateRange(periodStart: string, periodEnd: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return true
  const lo = dateFrom || "1970-01-01"
  const hi = dateTo || "2099-12-31"
  return periodStart <= hi && periodEnd >= lo
}

export default function AdminClassesPage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const router = useRouter()
  const adminClassesList = useAdminClasses()
  const classesOptions = useMemo(() => adminClassesList.map((c) => ({ id: c.id, name: c.name })), [adminClassesList])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminClassStatus | "all">("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [loading] = useState(false)

  const filteredClasses = useMemo(() => {
    return adminClassesList.filter((cls) => {
      if (!classOverlapsDateRange(cls.periodStart, cls.periodEnd, dateFrom, dateTo)) return false
      if (statusFilter !== "all" && cls.status !== statusFilter) return false
      if (classFilter !== "all" && cls.id !== classFilter) return false
      return true
    })
  }, [adminClassesList, dateFrom, dateTo, statusFilter, classFilter])

  const hasActiveFilters = useMemo(
    () => Boolean(dateFrom || dateTo || statusFilter !== "all" || classFilter !== "all"),
    [dateFrom, dateTo, statusFilter, classFilter]
  )
  const advancedFilterCount = useMemo(() => {
    let count = 0
    if (classFilter !== "all") count += 1
    return count
  }, [classFilter])

  const totals = useMemo(() => {
    const totalDue = filteredClasses.reduce((sum, c) => sum + c.totalDue, 0)
    const totalPaid = filteredClasses.reduce((sum, c) => sum + c.totalPaid, 0)
    const learners = filteredClasses.reduce((sum, c) => sum + c.learnersCount, 0)
    const ratio = totalDue > 0 ? totalPaid / totalDue : 0
    const count = filteredClasses.length
    return { totalDue, totalPaid, learners, ratio, count }
  }, [filteredClasses])

  function resetFilters() {
    setDateFrom("")
    setDateTo("")
    setClassFilter("all")
    setStatusFilter("all")
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard" />
        <AdminPageHeader
          title={t("adm_class_title")}
          subtitle={t("adm_class_subtitle")}
          gradientClassName="from-sky-600 via-indigo-600 to-violet-600"
          actions={
            <>
              <button
                onClick={() => {
                  router.push("/dashboard/admin/classes/nouvelle")
                }}
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-4 py-2 text-xs font-semibold text-primary shadow-md transition-colors hover:bg-white"
              >
                <Plus className="size-3.5" />
                <span>{t("adm_class_new_btn")}</span>
              </button>
            </>
          }
        />

        {/* Filtres (premium) — la synthèse KPI ci-dessous suit ce périmètre */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-slate-900 via-indigo-900 to-sky-800 px-4 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">{t("adm_learn_filters")}</p>
                <p className="mt-0.5 text-xs text-white/75">{t("adm_class_filter_hint")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  {t("adm_learn_filters_active")}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                  {t("adm_learn_filters_full")} ({adminClassesList.length} {t("adm_class_word_many")})
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowMoreFilters((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <SlidersHorizontal className="size-3.5" />
                {showMoreFilters ? t("adm_learn_less_filters") : t("adm_learn_more_filters")}
                {!showMoreFilters && advancedFilterCount > 0 ? (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] leading-none">{advancedFilterCount}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                {t("adm_learn_reset")}
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5 text-sky-600" />
                {t("adm_class_period_overlap")}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_date_from")}</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_date_to")}</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </label>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{t("adm_class_period_help")}</p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="size-3.5 text-violet-600" />
                {t("adm_learn_refinement")}
              </div>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{t("mp_col_status")}</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AdminClassStatus | "all")}
                  className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="all">{t("adm_class_status_all")}</option>
                  <option value="active">{t("adm_class_st_active_list")}</option>
                  <option value="finished">{t("adm_class_st_finished_list")}</option>
                  <option value="archived">{t("adm_class_st_archived_list")}</option>
                </select>
              </label>
              {showMoreFilters ? (
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_class")}</span>
                  <ClassSearchSelect
                    value={classFilter}
                    onValueChange={setClassFilter}
                    options={classesOptions}
                    allLabel={t("adm_learn_opt_all_classes")}
                    searchPlaceholder={t("adm_class_search_placeholder")}
                    emptyLabel={t("adm_class_search_empty")}
                    moreResultsLabel={t("adm_class_search_more")}
                  />
                </label>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
                  {advancedFilterCount > 0
                    ? `${advancedFilterCount} ${t("adm_learn_adv_active")}`
                    : t("adm_learn_more_filters")}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            <span className="font-medium text-foreground">
              {totals.count}{" "}
              {totals.count === 1 ? t("adm_class_word_one") : t("adm_class_word_many")}{" "}
              {t("adm_learn_scope")}
            </span>
            {totals.count === 0 ? (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                {t("adm_class_no_kpi")}
              </span>
            ) : null}
          </div>
        </div>

        {/* Synthèse filtrée — alignée sur les filtres ci-dessus */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("adm_learn_synth")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="relative overflow-hidden rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-500/15 via-sky-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_class_kpi_expected")}</p>
                <span className="inline-flex rounded-full bg-sky-500/15 p-1.5 text-sky-700">
                  <Wallet className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{formatMoney(totals.totalDue)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("adm_class_kpi_due_hint").replace("{n}", String(totals.count))}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-700/10">
                <div className="h-full w-full bg-gradient-to-r from-sky-500/55 via-cyan-500/45 to-indigo-500/50" />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/15 via-emerald-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_class_kpi_collected")}</p>
                <span className="inline-flex rounded-full bg-emerald-500/15 p-1.5 text-emerald-700">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{formatMoney(totals.totalPaid)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totals.totalDue > 0
                  ? t("adm_class_kpi_collected_pct").replace("{pct}", String(Math.round(totals.ratio * 100)))
                  : totals.count === 0
                    ? t("adm_class_kpi_none_selected")
                    : t("adm_class_kpi_no_due_scope")}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-700/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500/55 via-teal-500/45 to-sky-500/50"
                  style={{ width: `${Math.min(100, Math.round(totals.ratio * 100))}%` }}
                />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/15 via-violet-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_class_kpi_learners_cov")}</p>
                <span className="inline-flex rounded-full bg-violet-500/15 p-1.5 text-violet-700">
                  <Users className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-foreground">{totals.learners}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("adm_class_kpi_learners_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-700/10">
                <div className="h-full w-full bg-gradient-to-r from-violet-500/55 via-fuchsia-500/45 to-cyan-500/50" />
              </div>
            </article>
          </div>
        </div>

        {/* Classes grid — cartes premium avec acces fiche / promotion / edition */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <div key={`sk-${idx}`} className="rounded-3xl border border-border bg-card p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-52" />
                  <Skeleton className="mt-4 h-2 w-full" />
                  <Skeleton className="mt-3 h-24 w-full rounded-lg" />
                </div>
              ))
            : null}
          {!loading &&
            filteredClasses.map((cls) => {
            const ratio = cls.totalDue > 0 ? cls.totalPaid / cls.totalDue : 0
            const remaining = cls.totalDue - cls.totalPaid
            return (
              <div
                key={cls.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-md transition-all hover:border-primary/25 hover:shadow-xl"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-violet-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-100">
                        <School className="size-3 shrink-0" />
                        <span className="truncate">{cls.session}</span>
                      </div>
                      <Link
                        href={`/dashboard/admin/classes/${cls.id}`}
                        className="mt-2 block text-base font-bold tracking-tight text-foreground transition hover:text-primary"
                      >
                        {cls.name}
                        <Sparkles className="ml-1 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("adm_class_card_learners")
                          .replace("{n}", String(cls.learnersCount))
                          .replace("{amount}", formatMoney(cls.tuitionAmount))}
                      </p>
                      {cls.description?.trim() ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {cls.description}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        cls.status === "active"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : cls.status === "finished"
                            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cls.status === "active" && t("adm_class_badge_active")}
                      {cls.status === "finished" && t("adm_class_badge_finished")}
                      {cls.status === "archived" && t("adm_class_badge_archived")}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">{t("adm_class_encashed")}</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(ratio * 100)}% · {formatMoney(cls.totalPaid)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
                        style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t("adm_class_remain")}{" "}
                      <span className="font-semibold text-foreground">{formatMoney(Math.max(0, remaining))}</span>
                    </p>
                  </div>

                  <div className="mt-4 h-24 w-full rounded-xl bg-muted/30 p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cls.chartData}>
                        <defs>
                          <linearGradient id={`cls-${cls.id}-paid`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <Tooltip
                          formatter={(value: number) => formatMoney(value)}
                          labelFormatter={(label: string) => `${t("adm_class_chart_month")} ${label}`}
                        />
                        <Area type="monotone" dataKey="paid" stroke="#0ea5e9" strokeWidth={2} fill={`url(#cls-${cls.id}-paid)`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="flex-1 rounded-xl" asChild>
                      <Link href={`/dashboard/admin/classes/${cls.id}`}>
                        {t("adm_class_btn_fiche")}
                        <ArrowUpRight className="ml-1 size-3.5 opacity-80" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 rounded-xl" asChild>
                      <Link href={`/dashboard/admin/classes/${cls.id}/promotion`}>
                        <GraduationCap className="mr-1 size-3.5" />
                        {t("adm_class_btn_promote")}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="w-full rounded-xl sm:w-auto" asChild>
                      <Link href={`/dashboard/admin/classes/${cls.id}/edit`}>
                        <Pencil className="mr-1 size-3.5" />
                        {t("adm_class_btn_edit")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}

          {!loading && filteredClasses.length === 0 && (
            <AdminEmptyState
              title={t("adm_class_empty_title")}
              description={t("adm_class_empty_desc")}
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
                >
                  {t("adm_class_reset_filters")}
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
