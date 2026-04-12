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
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
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
import { formatFcfa, getClassById, type AdminLearner } from "@/services/admin-mock.service"
import { useAdminLearners } from "@/hooks/use-admin-learners"
import { useAdminClasses } from "@/hooks/use-admin-classes"
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
  const router = useRouter()
  const adminLearners = useAdminLearners()
  const adminClasses = useAdminClasses()
  const [query, setQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | AdminLearner["status"]>("all")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [paymentSituation, setPaymentSituation] = useState<PaymentSituation>("all")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
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
          title="Apprenants"
          subtitle="Liste centrale avec filtres avances, suivi des soldes et acces rapide a la fiche."
          gradientClassName="from-violet-600 via-fuchsia-600 to-rose-600"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/apprenants/nouveau")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-white"
              >
                <User className="size-3.5" />
                Nouvel apprenant
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/apprenants/import")}
                className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-white/20"
              >
                Importer
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
                <p className="text-sm font-semibold tracking-tight">Filtres</p>
                <p className="mt-0.5 text-xs text-white/75">
                  Periode d&apos;inscription, classe, statut, situation de paiement et recherche libre.
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
                  Vue complete ({adminLearners.length} apprenants)
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
                <CalendarDays className="size-3.5 text-fuchsia-600" />
                Date d&apos;inscription
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 rounded-xl pl-9"
                  placeholder="Nom, telephone, ID, classe..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="size-3.5 text-violet-600" />
                Affinage
              </div>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Statut apprenant</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="suspended">Suspendus</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Classe</span>
                <div className="relative">
                  <GraduationCap className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-xl border border-input bg-background py-2 pr-8 pl-9 text-sm shadow-sm"
                  >
                    <option value="all">Toutes les classes</option>
                    {classOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Situation de paiement</span>
                <select
                  value={paymentSituation}
                  onChange={(e) => setPaymentSituation(e.target.value as PaymentSituation)}
                  className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="all">Toutes</option>
                  <option value="solde_ok">Solde regle</option>
                  <option value="en_retard">Reste a payer</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            <span className="font-medium text-foreground">
              {totals.count} apprenant{totals.count !== 1 ? "s" : ""} dans le perimetre
            </span>
            {totals.count === 0 ? (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                Aucun resultat — ajustez les filtres
              </span>
            ) : null}
          </div>
        </div>

        {/* KPI */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Synthese du perimetre</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard
              label="Pension totale (du)"
              value={formatFcfa(totals.totalDue)}
              hint="Somme des montants dus filtres"
              icon={<Wallet className="size-4 text-violet-600" />}
            />
            <AdminKpiCard
              label="Deja paye"
              value={formatFcfa(totals.totalPaid)}
              hint={
                totals.totalDue > 0
                  ? `${Math.round(totals.ratio * 100)}% du du sur ce perimetre`
                  : "Aucun du"
              }
              icon={<Users className="size-4 text-emerald-600" />}
            />
            <AdminKpiCard
              label="Reste global"
              value={formatFcfa(totals.remaining)}
              hint="Ecart cumule sur les lignes filtrees"
              icon={<Wallet className="size-4 text-rose-600" />}
            />
            <AdminKpiCard
              label="Effectif"
              value={`${totals.count}`}
              hint="Nombre d'apprenants affiches (hors pagination)"
              icon={<GraduationCap className="size-4 text-fuchsia-600" />}
            />
          </div>
        </div>

        {/* Table desktop */}
        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Apprenant</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Telephone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Du</TableHead>
                <TableHead className="text-right">Paye</TableHead>
                <TableHead className="w-[140px]">Progression</TableHead>
                <TableHead className="sticky right-0 z-10 min-w-[100px] bg-card text-right shadow-[inset_1px_0_0_hsl(var(--border))]">
                  Actions
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
                    <p className="font-medium text-foreground">Aucun apprenant</p>
                    <p className="mt-1 text-sm">Modifiez les filtres ou ajoutez un apprenant.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                      Reinitialiser
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
                          <Badge className="bg-emerald-500/15 text-emerald-800">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Suspendu</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatFcfa(l.due)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                        {formatFcfa(l.paid)}
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
                      <TableCell className="sticky right-0 z-10 bg-card shadow-[inset_1px_0_0_hsl(var(--border))] group-hover:bg-muted/30">
                        <Button size="sm" variant="outline" asChild className="w-full sm:w-auto">
                          <Link href={`/dashboard/admin/apprenants/${l.id}`}>Fiche</Link>
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
                      <Badge className="bg-emerald-500/15 text-emerald-800">Actif</Badge>
                    ) : (
                      <Badge variant="secondary">Suspendu</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{cls?.name ?? l.classId}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm">
                    <Phone className="size-3.5" />
                    {l.phone}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Du</p>
                      <p className="font-semibold tabular-nums">{formatFcfa(l.due)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Paye</p>
                      <p className="font-semibold tabular-nums text-emerald-700">{formatFcfa(l.paid)}</p>
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
                  <Button className="mt-3 w-full" variant="outline" asChild>
                    <Link href={`/dashboard/admin/apprenants/${l.id}`}>Voir la fiche</Link>
                  </Button>
                </div>
              )
            })}
          {!loading && filtered.length === 0 ? (
            <AdminEmptyState
              title="Aucun apprenant"
              description="Ajustez les filtres ou creez un apprenant."
              action={
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  Reinitialiser
                </Button>
              }
            />
          ) : null}
        </div>

        {/* Pagination */}
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
      </div>
    </div>
  )
}
