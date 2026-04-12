"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
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
import { formatFcfa, type AdminClassStatus } from "@/services/admin-mock.service"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { MobileBackButton } from "@/components/mobile-back-button"

function classOverlapsDateRange(periodStart: string, periodEnd: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return true
  const lo = dateFrom || "1970-01-01"
  const hi = dateTo || "2099-12-31"
  return periodStart <= hi && periodEnd >= lo
}

export default function AdminClassesPage() {
  const router = useRouter()
  const adminClassesList = useAdminClasses()
  const classesOptions = useMemo(() => adminClassesList.map((c) => ({ id: c.id, name: c.name })), [adminClassesList])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminClassStatus | "all">("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(timer)
  }, [])

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
          title="Classes & sessions"
          subtitle="Pilotage des groupes, pensions, fiche detail, promotion et edition."
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
                <span>Nouvelle classe</span>
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
                <p className="text-sm font-semibold tracking-tight">Filtres</p>
                <p className="mt-0.5 text-xs text-white/75">
                  Periode, statut et classe — les indicateurs ci-dessous se mettent a jour en direct.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  Filtres actifs
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                  Vue complete ({adminClassesList.length} classes)
                </span>
              )}
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5 text-sky-600" />
                Periode (chevauchement)
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Du</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Au</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </label>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Une classe est incluse si sa periode chevauche l&apos;intervalle (un seul champ rempli = borne ouverte).
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="size-3.5 text-violet-600" />
                Affinage
              </div>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Statut</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AdminClassStatus | "all")}
                  className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actives</option>
                  <option value="finished">Terminees</option>
                  <option value="archived">Archivees</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Classe</span>
                <div className="relative">
                  <School className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-xl border border-input bg-background py-2 pr-8 pl-9 text-sm shadow-sm"
                  >
                    <option value="all">Toutes les classes</option>
                    {classesOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            <span className="font-medium text-foreground">
              {totals.count} classe{totals.count !== 1 ? "s" : ""} dans le perimetre
            </span>
            {totals.count === 0 ? (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                Aucun resultat — les KPI affichent 0
              </span>
            ) : null}
          </div>
        </div>

        {/* Synthèse filtrée — alignée sur les filtres ci-dessus */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Synthese du perimetre</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminKpiCard
              label="Revenus attendus"
              value={formatFcfa(totals.totalDue)}
              hint={`${totals.count} classe(s) • du total filtre`}
              icon={<Wallet className="size-4 text-sky-600" />}
            />
            <AdminKpiCard
              label="Revenus encaisses"
              value={formatFcfa(totals.totalPaid)}
              hint={
                totals.totalDue > 0
                  ? `${Math.round(totals.ratio * 100)}% des montants attendus (perimetre)`
                  : totals.count === 0
                    ? "Aucune classe selectionnee"
                    : "Pas de du dans ce perimetre"
              }
              icon={<TrendingUp className="size-4 text-emerald-600" />}
            />
            <AdminKpiCard
              label="Apprenants couverts"
              value={`${totals.learners}`}
              hint="Somme des effectifs des classes du perimetre"
              icon={<Users className="size-4 text-violet-600" />}
            />
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
                        {cls.learnersCount} apprenants · Pension {formatFcfa(cls.tuitionAmount)}
                      </p>
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
                      {cls.status === "active" && "Active"}
                      {cls.status === "finished" && "Terminee"}
                      {cls.status === "archived" && "Archivee"}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Encaisse</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(ratio * 100)}% · {formatFcfa(cls.totalPaid)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
                        style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Reste <span className="font-semibold text-foreground">{formatFcfa(Math.max(0, remaining))}</span>
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
                          formatter={(value: number) => formatFcfa(value)}
                          labelFormatter={(label: string) => `Mois : ${label}`}
                        />
                        <Area type="monotone" dataKey="paid" stroke="#0ea5e9" strokeWidth={2} fill={`url(#cls-${cls.id}-paid)`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="flex-1 rounded-xl" asChild>
                      <Link href={`/dashboard/admin/classes/${cls.id}`}>
                        Fiche
                        <ArrowUpRight className="ml-1 size-3.5 opacity-80" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 rounded-xl" asChild>
                      <Link href={`/dashboard/admin/classes/${cls.id}/promotion`}>
                        <GraduationCap className="mr-1 size-3.5" />
                        Promouvoir
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="w-full rounded-xl sm:w-auto" asChild>
                      <Link href={`/dashboard/admin/classes/${cls.id}/edit`}>
                        <Pencil className="mr-1 size-3.5" />
                        Editer
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}

          {!loading && filteredClasses.length === 0 && (
            <AdminEmptyState
              title="Aucune classe trouvee"
              description="Ajuste tes filtres ou cree une nouvelle classe."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
                >
                  Reinitialiser les filtres
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
