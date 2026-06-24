"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
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
import { cn } from "@/lib/utils"
import { ManagerLearnersService, type ManagedLearner } from "@/domains/manager-learners"
import type { ManagedLearnerStatus } from "@/domains/manager-learners/types"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ClassSearchSelect } from "@/components/admin/class-search-select"
import { MobileBackButton } from "@/components/mobile-back-button"
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
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"

type TFn = (k: import("@/services/i18n").TranslationKey) => string

type PaymentSituation = "all" | "solde_ok" | "en_retard"

function sumPaid(l: ManagedLearner): number {
  return l.payments.reduce((s, p) => s + p.amount, 0)
}

function learnerEnrolledInRange(enrolledAt: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return true
  const d = enrolledAt.slice(0, 10)
  const lo = dateFrom || "1970-01-01"
  const hi = dateTo || "2099-12-31"
  return d >= lo && d <= hi
}

function paymentMatches(s: PaymentSituation, l: ManagedLearner) {
  if (s === "all") return true
  const remaining = l.tuitionDue - sumPaid(l)
  if (s === "solde_ok") return remaining <= 0.01
  return remaining > 0.01
}

export default function ManagerApprenantsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [learners, setLearners] = useState<ManagedLearner[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLearners(ManagerLearnersService.getAll())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener("manager-learners-updated", refresh)
    return () => window.removeEventListener("manager-learners-updated", refresh)
  }, [refresh])

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-28 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard" />
        <AdminPageHeader
          title={t("mgr_learn_title")}
          subtitle={t("mgr_learn_subtitle")}
          gradientClassName="from-violet-600 via-fuchsia-600 to-rose-600"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/manager/apprenants/nouveau")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-white"
              >
                <User className="size-3.5" />
                Nouvel apprenant
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/manager/apprenants/import")}
                className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-white/20"
              >
                {t("mgr_tab_import")}
              </button>
            </div>
          }
        />

        <div className="mt-6">
          <LearnerListTab learners={learners} loading={loading} t={t} />
        </div>
      </div>
    </div>
  )
}

function LearnerListTab({
  learners,
  loading,
  t,
}: {
  learners: ManagedLearner[]
  loading: boolean
  t: TFn
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ManagedLearnerStatus>("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [paymentSituation, setPaymentSituation] = useState<PaymentSituation>("all")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const classOptions = useMemo(() => {
    const s = new Set<string>()
    learners.forEach((l) => s.add(l.className))
    return [...s].sort().map((name) => ({ id: name, name }))
  }, [learners])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return learners.filter((l) => {
      if (!learnerEnrolledInRange(l.enrolledAt, dateFrom, dateTo)) return false
      if (statusFilter !== "all" && (l.status ?? "active") !== statusFilter) return false
      if (classFilter !== "all" && l.className !== classFilter) return false
      if (!paymentMatches(paymentSituation, l)) return false
      if (!q) return true
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.replace(/\s/g, "").includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.className.toLowerCase().includes(q)
      )
    })
  }, [learners, query, dateFrom, dateTo, statusFilter, classFilter, paymentSituation])

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
    return count
  }, [classFilter])

  const paymentCounts = useMemo(() => {
    let fullyPaid = 0
    let outstanding = 0
    for (const l of learners) {
      if (l.tuitionDue - sumPaid(l) <= 0.01) fullyPaid += 1
      else outstanding += 1
    }
    return { all: learners.length, fullyPaid, outstanding }
  }, [learners])

  const totals = useMemo(() => {
    const totalDue = filtered.reduce((s, l) => s + l.tuitionDue, 0)
    const totalPaid = filtered.reduce((s, l) => s + sumPaid(l), 0)
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
    <>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
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
                {t("adm_learn_filters_full")} ({learners.length} {t("adm_learn_learners")})
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
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_pay_sit")}</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "all" as const, label: t("adm_learn_opt_pay_all"), count: paymentCounts.all, icon: Users },
                    {
                      value: "solde_ok" as const,
                      label: t("adm_learn_opt_solde"),
                      count: paymentCounts.fullyPaid,
                      icon: CheckCircle2,
                    },
                    {
                      value: "en_retard" as const,
                      label: t("adm_learn_opt_due"),
                      count: paymentCounts.outstanding,
                      icon: CircleAlert,
                    },
                  ] as const
                ).map(({ value, label, count, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentSituation(value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      paymentSituation === value
                        ? value === "solde_ok"
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                          : value === "en_retard"
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-100"
                            : "border-violet-500/50 bg-violet-500/15 text-violet-900 dark:text-violet-100"
                        : "border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-muted/40",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0 opacity-80" />
                    {label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                        paymentSituation === value ? "bg-black/10" : "bg-muted",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {showMoreFilters ? (
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{t("adm_learn_class")}</span>
                <ClassSearchSelect
                  value={classFilter}
                  onValueChange={setClassFilter}
                  options={classOptions}
                  allLabel={t("adm_learn_opt_all_classes")}
                  searchPlaceholder={t("adm_class_search_placeholder")}
                  emptyLabel={t("adm_class_search_empty")}
                  moreResultsLabel={t("adm_class_search_more")}
                  triggerClassName="h-9 text-xs"
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

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_learn_synth")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            label="Pension totale (du)"
            value={formatFcfa(totals.totalDue)}
            hint="Somme des montants dus filtres"
            icon={<Wallet className="size-4 text-violet-600" />}
            loading={loading}
          />
          <AdminKpiCard
            label="Deja encaisse"
            value={formatFcfa(totals.totalPaid)}
            hint={totals.totalDue > 0 ? `${Math.round(totals.ratio * 100)}% du du sur ce perimetre` : "Aucun du"}
            icon={<Users className="size-4 text-emerald-600" />}
            loading={loading}
          />
          <AdminKpiCard
            label="Reste global"
            value={formatFcfa(totals.remaining)}
            hint="Ecart cumule sur les lignes filtrees"
            icon={<Wallet className="size-4 text-rose-600" />}
            loading={loading}
          />
          <AdminKpiCard
            label="Effectif"
            value={`${totals.count}`}
            hint="Hors pagination"
            icon={<GraduationCap className="size-4 text-fuchsia-600" />}
            loading={loading}
          />
        </div>
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Apprenant</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Telephone</TableHead>
              <TableHead className="text-right">Du</TableHead>
              <TableHead className="text-right">Paye</TableHead>
              <TableHead className="w-[140px]">Progression</TableHead>
              <TableHead className="sticky right-0 z-10 min-w-[120px] bg-card text-right shadow-[inset_1px_0_0_hsl(var(--border))]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : null}
            {!loading && paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <AdminEmptyState
                    title="Aucun apprenant"
                    description={t("mgr_empty_learners")}
                    action={
                      <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                        {t("adm_learn_reset")}
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : null}
            {!loading &&
              paged.map((l) => {
                const paid = sumPaid(l)
                const ratio = l.tuitionDue > 0 ? Math.min(100, Math.round((paid / l.tuitionDue) * 100)) : 100
                const reste = Math.max(0, l.tuitionDue - paid)
                return (
                  <TableRow
                    key={l.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/manager/apprenants/${l.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{l.fullName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{l.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.className}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Phone className="size-3.5 text-muted-foreground" />
                        {l.phone}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatFcfa(l.tuitionDue)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                      {formatFcfa(paid)}
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
                          Reste {formatFcfa(reste)} · {ratio}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell
                      className="sticky right-0 z-10 bg-card shadow-[inset_1px_0_0_hsl(var(--border))] group-hover:bg-muted/30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-xl sm:w-auto"
                        onClick={() => router.push(`/dashboard/manager/apprenants/${l.id}`)}
                      >
                        {t("mgr_learner_fiche")}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

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
            const paid = sumPaid(l)
            const ratio = l.tuitionDue > 0 ? Math.min(100, Math.round((paid / l.tuitionDue) * 100)) : 100
            const reste = Math.max(0, l.tuitionDue - paid)
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-2xl border border-border/80 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm outline-none transition hover:border-violet-500/40 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => router.push(`/dashboard/manager/apprenants/${l.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    router.push(`/dashboard/manager/apprenants/${l.id}`)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{l.fullName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{l.id}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{l.className}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm">
                  <Phone className="size-3.5" />
                  {l.phone}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Du</p>
                    <p className="font-semibold tabular-nums">{formatFcfa(l.tuitionDue)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Paye</p>
                    <p className="font-semibold tabular-nums text-emerald-700">{formatFcfa(paid)}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    style={{ width: `${ratio}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Reste {formatFcfa(reste)} · {ratio}%
                </p>
                <Button
                  className="mt-3 w-full rounded-xl"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/manager/apprenants/${l.id}`)
                  }}
                >
                  {t("mgr_learner_fiche")}
                </Button>
              </div>
            )
          })}
        {!loading && filtered.length === 0 ? (
          <AdminEmptyState
            title="Aucun apprenant"
            description={t("mgr_empty_learners")}
            action={
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                {t("adm_learn_reset")}
              </Button>
            }
          />
        ) : null}
      </div>

      {!loading && filtered.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} / {pageCount} · {filtered.length} ligne{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Par page
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

    </>
  )
}
