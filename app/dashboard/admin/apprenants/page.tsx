"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Phone,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  Users,
  Wallet,
} from "lucide-react"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MobileBackButton } from "@/components/mobile-back-button"
import { getClassById, type AdminLearner } from "@/services/admin-mock.service"
import { useAdminLearners } from "@/hooks/use-admin-learners"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { useLocale } from "@/hooks/use-locale"
type PaymentSituation = "all" | "solde_ok" | "en_retard"

function learnerCreatedInRange(createdAt: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return true
  const d = createdAt.slice(0, 10)
  const lo = dateFrom || "1970-01-01"
  const hi = dateTo || "2099-12-31"
  return d >= lo && d <= hi
}

function paymentMatches(s: PaymentSituation, l: AdminLearner) {
  if (s === "all") return true
  const remaining = l.due - l.paid
  if (s === "solde_ok") return remaining <= 0.01
  return remaining > 0.01
}

export default function AdminApprenantsPage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const router = useRouter()
  const adminLearners = useAdminLearners()
  const adminClasses = useAdminClasses()
  const [query, setQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | AdminLearner["status"]>("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [paymentSituation, setPaymentSituation] = useState<PaymentSituation>("all")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const loadTimer = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(loadTimer)
  }, [])

  const classOptions = useMemo(() => adminClasses.map((c) => ({ id: c.id, name: c.name })), [adminClasses])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminLearners.filter((l) => {
      if (!learnerCreatedInRange(l.createdAt, dateFrom, dateTo)) return false
      if (statusFilter !== "all" && l.status !== statusFilter) return false
      if (classFilter !== "all" && l.classId !== classFilter) return false
      if (!paymentMatches(paymentSituation, l)) return false
      if (!q) return true
      const cls = getClassById(l.classId)?.name ?? ""
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.replace(/\s/g, "").includes(q) ||
        l.id.toLowerCase().includes(q) ||
        cls.toLowerCase().includes(q)
      )
    })
  }, [query, dateFrom, dateTo, statusFilter, classFilter, paymentSituation])

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        query.trim() ||
          dateFrom ||
          dateTo ||
          statusFilter !== "all" ||
          classFilter !== "all" ||
          paymentSituation !== "all",
      ),
    [query, dateFrom, dateTo, statusFilter, classFilter, paymentSituation],
  )
  const advancedFilterCount = useMemo(() => {
    let count = 0
    if (classFilter !== "all") count += 1
    if (paymentSituation !== "all") count += 1
    return count
  }, [classFilter, paymentSituation])

  const totals = useMemo(() => {
    const totalDue = filtered.reduce((s, l) => s + l.due, 0)
    const totalPaid = filtered.reduce((s, l) => s + l.paid, 0)
    const remaining = Math.max(0, totalDue - totalPaid)
    const ratio = totalDue > 0 ? totalPaid / totalDue : 0
    return { totalDue, totalPaid, remaining, ratio, count: filtered.length }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [query, dateFrom, dateTo, statusFilter, classFilter, paymentSituation, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function resetFilters() {
    setQuery("")
    setDateFrom("")
    setDateTo("")
    setStatusFilter("all")
    setClassFilter("all")
    setPaymentSituation("all")
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-28 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard" />
        <AdminPageHeader
          title={t("adm_learn_title")}
          subtitle={t("adm_learn_subtitle")}
          gradientClassName="from-violet-600 via-fuchsia-600 to-rose-600"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/apprenants/nouveau")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-white"
              >
                <User className="size-3.5" />
                {t("adm_learn_new")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/apprenants/import")}
                className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-white/20"
              >
                {t("adm_learn_import")}
              </button>
            </div>
          }
        />

        {/* Filtres premium */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-slate-900 via-violet-900 to-fuchsia-900 px-4 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">{t("adm_learn_filters")}</p>
                <p className="mt-0.5 text-xs text-white/75">{t("adm_learn_filters_hint")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  {t("adm_learn_filters_active")}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                  {t("adm_learn_filters_full")} ({adminLearners.length} {t("adm_learn_learners")})
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
                <CalendarDays className="size-3.5 text-fuchsia-600" />
                {t("adm_learn_date_reg")}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_date_from")}</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_date_to")}</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm"
                  />
                </label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 rounded-xl pl-9 text-xs"
                  placeholder={t("adm_learn_placeholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="size-3.5 text-violet-600" />
                {t("adm_learn_refinement")}
              </div>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_status")}</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm"
                >
                  <option value="all">{t("adm_learn_opt_all")}</option>
                  <option value="active">{t("adm_learn_opt_active")}</option>
                  <option value="suspended">{t("adm_learn_opt_suspended")}</option>
                </select>
              </label>
              {showMoreFilters ? (
                <>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_class")}</span>
                    <div className="relative">
                      <GraduationCap className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="h-9 w-full appearance-none rounded-xl border border-input bg-background py-1.5 pr-8 pl-9 text-xs shadow-sm"
                      >
                        <option value="all">{t("adm_learn_opt_all_classes")}</option>
                        {classOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_pay_sit")}</span>
                    <select
                      value={paymentSituation}
                      onChange={(e) => setPaymentSituation(e.target.value as PaymentSituation)}
                      className="h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm"
                    >
                      <option value="all">{t("adm_learn_opt_pay_all")}</option>
                      <option value="solde_ok">{t("adm_learn_opt_solde")}</option>
                      <option value="en_retard">{t("adm_learn_opt_due")}</option>
                    </select>
                  </label>
                </>
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
              {totals.count === 1 ? t("adm_learn_learner_one") : t("adm_learn_learners")}{" "}
              {t("adm_learn_scope")}
            </span>
            {totals.count === 0 ? (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                {t("adm_learn_no_result")}
              </span>
            ) : null}
          </div>
        </div>

        {/* KPI */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("adm_learn_synth")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/15 via-emerald-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_learn_kpi_tuition")}</p>
                <span className="inline-flex rounded-full bg-emerald-500/15 p-1.5 text-emerald-700">
                  <Wallet className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.60rem] font-extrabold leading-none tabular-nums text-foreground">{formatMoney(totals.totalDue)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("adm_learn_kpi_tuition_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-700/10">
                <div className="h-full w-full bg-gradient-to-r from-emerald-600/55 via-cyan-500/45 to-sky-500/55" />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-500/15 via-sky-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_learn_kpi_paid")}</p>
                <span className="inline-flex rounded-full bg-sky-500/15 p-1.5 text-sky-700">
                  <Users className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.60rem] font-extrabold leading-none tabular-nums text-foreground">{formatMoney(totals.totalPaid)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totals.totalDue > 0
                  ? `${Math.round(totals.ratio * 100)}% ${t("adm_learn_kpi_paid_hint2")}`
                  : t("adm_learn_kpi_no_due")}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-700/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-500/50 via-indigo-500/45 to-fuchsia-500/50"
                  style={{ width: `${Math.min(100, Math.round(totals.ratio * 100))}%` }}
                />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/15 via-amber-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_learn_kpi_remain")}</p>
                <span className="inline-flex rounded-full bg-amber-500/15 p-1.5 text-amber-700">
                  <Wallet className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.60rem] font-extrabold leading-none tabular-nums text-foreground">{formatMoney(totals.remaining)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("adm_learn_kpi_remain_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-700/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500/55 via-orange-500/45 to-rose-500/50"
                  style={{ width: `${Math.max(14, Math.min(100, totals.totalDue > 0 ? Math.round((totals.remaining / totals.totalDue) * 100) : 0))}%` }}
                />
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/15 via-violet-50/50 to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("adm_learn_kpi_headcount")}</p>
                <span className="inline-flex rounded-full bg-violet-500/15 p-1.5 text-violet-700">
                  <GraduationCap className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[1.60rem] font-extrabold leading-none tabular-nums text-foreground">{totals.count}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("adm_learn_kpi_head_hint")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-700/10">
                <div className="h-full w-full bg-gradient-to-r from-violet-500/55 via-fuchsia-500/45 to-cyan-500/50" />
              </div>
            </article>
          </div>
        </div>

        {/* Table desktop */}
        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>{t("adm_learn_table_name")}</TableHead>
                <TableHead>{t("adm_learn_table_class")}</TableHead>
                <TableHead>{t("adm_learn_table_phone")}</TableHead>
                <TableHead>{t("adm_learn_table_status")}</TableHead>
                <TableHead className="text-right">{t("adm_learn_table_due")}</TableHead>
                <TableHead className="text-right">{t("adm_learn_table_paid")}</TableHead>
                <TableHead className="w-[140px]">{t("adm_learn_th_progress")}</TableHead>
                <TableHead className="sticky right-0 z-10 min-w-[100px] bg-card text-right shadow-[inset_1px_0_0_hsl(var(--border))]">
                  {t("adm_learn_th_actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading && paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <p className="font-medium text-foreground">{t("adm_learn_empty_title")}</p>
                    <p className="mt-1 text-sm">{t("adm_learn_empty_desc")}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                      {t("adm_learn_reset")}
                    </Button>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading &&
                paged.map((l) => {
                  const cls = getClassById(l.classId)
                  const ratio = l.due > 0 ? Math.min(100, Math.round((l.paid / l.due) * 100)) : 100
                  const reste = Math.max(0, l.due - l.paid)
                  return (
                    <TableRow key={l.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{l.fullName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{l.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cls?.name ?? l.classId}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Phone className="size-3.5 text-muted-foreground" />
                          {l.phone}
                        </span>
                      </TableCell>
                      <TableCell>
                        {l.status === "active" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800">{t("adm_st_active")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("adm_st_suspended")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.due)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                        {formatMoney(l.paid)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {t("adm_learn_remain_lbl")} {formatMoney(reste)} · {ratio}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 bg-card shadow-[inset_1px_0_0_hsl(var(--border))] group-hover:bg-muted/30">
                        <Button size="sm" variant="outline" asChild className="w-full sm:w-auto">
                          <Link href={`/dashboard/admin/apprenants/${l.id}`}>{t("adm_learn_btn_sheet")}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>

        {/* Cartes mobile */}
        <div className="mt-4 space-y-3 md:hidden">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={`msk-${i}`} className="rounded-2xl border p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </div>
              ))
            : null}
          {!loading &&
            paged.map((l) => {
              const cls = getClassById(l.classId)
              const ratio = l.due > 0 ? Math.min(100, Math.round((l.paid / l.due) * 100)) : 100
              const reste = Math.max(0, l.due - l.paid)
              return (
                <div
                  key={l.id}
                  className="rounded-2xl border border-border/80 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{l.fullName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{l.id}</p>
                    </div>
                    {l.status === "active" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-800">{t("adm_st_active")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("adm_st_suspended")}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{cls?.name ?? l.classId}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm">
                    <Phone className="size-3.5" />
                    {l.phone}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t("adm_learn_table_due")}</p>
                      <p className="font-semibold tabular-nums">{formatMoney(l.due)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t("adm_learn_table_paid")}</p>
                      <p className="font-semibold tabular-nums text-emerald-700">{formatMoney(l.paid)}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("adm_learn_remain_lbl")} {formatMoney(reste)} · {ratio}%
                  </p>
                  <Button className="mt-3 w-full" variant="outline" asChild>
                    <Link href={`/dashboard/admin/apprenants/${l.id}`}>{t("adm_learn_btn_view")}</Link>
                  </Button>
                </div>
              )
            })}
          {!loading && filtered.length === 0 ? (
            <AdminEmptyState
              title={t("adm_learn_empty_title")}
              description={t("adm_learn_empty_desc")}
              action={
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  {t("adm_learn_reset")}
                </Button>
              }
            />
          ) : null}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("adm_learn_pagination")} {page} {t("adm_learn_of")} {pageCount} · {filtered.length}{" "}
              {t("adm_learn_lines")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {t("adm_learn_per_page_lbl")}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                >
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
