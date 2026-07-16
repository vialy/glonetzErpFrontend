"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import { ArrowUpRight, CalendarDays, GraduationCap, Pencil, School, Users } from "lucide-react"
import { DetailPageSkeleton } from "@/components/loading/data-skeletons"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { MobileBackButton } from "@/components/mobile-back-button"
import { classesService, applyClassStatsToRow, classFinancialFromStats, type StaffClass, type StaffClassStats } from "@/domains/classes"
import { enrichClassWithLearnerStats } from "@/domains/classes/enrich-classes"
import { useAdminLearnersQuery } from "@/hooks/use-admin-learners"
import { useStaffPaidAggregates } from "@/hooks/use-staff-paid-aggregates"
import { getClassById } from "@/services/admin-mock.service"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { isApiDataProvider } from "@/lib/data-provider"

export default function AdminClassFichePage() {
  const { t, locale } = useLocale()
  const { role } = useAuth()
  const pathname = usePathname() ?? "/dashboard/admin/classes"
  const classesBase = pathname.startsWith("/dashboard/collaborateur")
    ? "/dashboard/collaborateur/classes"
    : "/dashboard/admin/classes"
  const learnersBase = pathname.startsWith("/dashboard/collaborateur")
    ? "/dashboard/collaborateur/apprenants"
    : "/dashboard/admin/apprenants"
  const canManageClasses = role === "admin" || role === "manager"
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const { learners } = useAdminLearnersQuery()
  const { paidByClass } = useStaffPaidAggregates()
  const [cls, setCls] = useState<StaffClass | null>(null)
  // Rollup financier calcule cote back-end (GET /staff/classes/:id/details).
  const [stats, setStats] = useState<StaffClassStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)

  useEffect(() => {
    if (!classId) {
      setCls(null)
      setStats(null)
      setLoadingDetail(false)
      return
    }

    if (!isApiDataProvider()) {
      setCls(getClassById(classId) ?? null)
      setStats(null)
      setLoadingDetail(false)
      return
    }

    let cancelled = false
    setLoadingDetail(true)

    const load = () => {
      classesService
        .getDetails(classId)
        .then((details) => {
          if (cancelled) return
          if (details) {
            setCls(details.class)
            setStats(details.stats)
            setLoadingDetail(false)
            return
          }
          // Repli si /details indisponible : on charge au moins la fiche classe.
          return classesService.get(classId).then((item) => {
            if (cancelled) return
            setCls(item)
            setStats(null)
            setLoadingDetail(false)
          })
        })
        .catch(() => {
          if (!cancelled) {
            setCls(null)
            setStats(null)
            setLoadingDetail(false)
          }
        })
    }

    load()
    window.addEventListener("admin-payments-updated", load)
    return () => {
      cancelled = true
      window.removeEventListener("admin-payments-updated", load)
    }
  }, [classId])

  const countInClass = learners.filter((l) => l.classId === classId).length
  const displayClass = useMemo(() => {
    if (!cls) return null
    const enriched = enrichClassWithLearnerStats(cls, countInClass)
    if (!isApiDataProvider() || !stats) return enriched
    return applyClassStatsToRow(enriched, stats, paidByClass[classId] ?? stats.totalPaid)
  }, [cls, countInClass, stats, classId, paidByClass])

  const financial = useMemo(
    () =>
      stats && displayClass
        ? classFinancialFromStats(stats, {
            learnersCount: displayClass.learnersCount,
            totalDue: displayClass.totalDue,
            totalPaid: displayClass.totalPaid,
            tuitionAmount: displayClass.tuitionAmount,
          })
        : null,
    [stats, displayClass],
  )

  if (loadingDetail) {
    return <DetailPageSkeleton />
  }

  if (!displayClass) {
    return (
      <div className="px-4 py-10 md:px-6">
        <MobileBackButton fallbackHref={classesBase} />
        <p className="mt-6 text-muted-foreground">{t("adm_class_fiche_notfound")}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={classesBase}>{t("adm_class_fiche_back")}</Link>
        </Button>
      </div>
    )
  }

  const ratioPct =
    financial && financial.netExpected > 0 && financial.totalPaidClass > 0
      ? Math.max(1, Math.round((financial.totalPaidClass / financial.netExpected) * 100))
      : financial && financial.totalDueExpected > 0 && financial.totalPaidClass > 0
        ? Math.max(1, Math.round((financial.totalPaidClass / financial.totalDueExpected) * 100))
        : displayClass.totalDue > 0 && displayClass.totalPaid > 0
          ? Math.max(1, Math.round((displayClass.totalPaid / displayClass.totalDue) * 100))
          : 0
  const remainingMock = Math.max(0, displayClass.totalDue - displayClass.totalPaid)

  return (
    <div className="min-h-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
      <MobileBackButton fallbackHref={classesBase} />
      <AdminPageHeader
        title={displayClass.name}
        subtitle={t("adm_class_fiche_session_sub")
          .replace("{session}", displayClass.session)
          .replace("{ref}", String(displayClass.learnersCount))
          .replace("{attached}", String(countInClass))}
        gradientClassName="from-sky-600 via-indigo-600 to-violet-700"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-primary-foreground/40 bg-white/10 text-primary-foreground hover:bg-white/20"
              asChild
            >
              <Link href={classesBase}>
                <School className="mr-2 size-3.5" />
                {t("adm_class_fiche_all_classes")}
              </Link>
            </Button>
          </div>
        }
      />

      {isApiDataProvider() && financial ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
            <p className="text-sm font-semibold text-foreground">{t("adm_class_fiche_session_title")}</p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-3">
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_enrolled")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{financial.sessionEnrolled}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_promoted")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{financial.sessionPromoted}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_current_count")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-sky-700">{financial.learnersCurrent}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px border-t border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_pension")}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatMoney(financial.tuitionAmount)}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_due_current")}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatMoney(financial.netExpected)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t("adm_class_net_expected")}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_due_expected")}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatMoney(financial.catalogExpected)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t("adm_class_catalog_expected")}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_encashed")}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{formatMoney(financial.totalPaidClass)}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_remain")}</p>
              <p
                className={`mt-1 text-lg font-bold tabular-nums ${
                  financial.remaining <= 0.01 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700"
                }`}
              >
                {formatMoney(financial.remaining <= 0.01 ? 0 : financial.remaining)}
              </p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_rate")}</p>
              <p className="mt-1 text-lg font-bold">{ratioPct}%</p>
            </div>
          </div>
          {financial.scholarshipCount > 0 ? (
            <div className="grid grid-cols-1 gap-px border-t border-border/60 bg-border/60 sm:grid-cols-2">
              <div className="bg-card px-5 py-3 text-sm">
                <span className="text-muted-foreground">{t("adm_class_scholarship_count")} : </span>
                <span className="font-semibold tabular-nums">{financial.scholarshipCount}</span>
              </div>
              <div className="bg-card px-5 py-3 text-sm">
                <span className="text-muted-foreground">{t("adm_class_total_scholarship")} : </span>
                <span className="font-semibold tabular-nums text-sky-700">−{formatMoney(financial.totalScholarship)}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_pension")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(displayClass.tuitionAmount)}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_encashed")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{formatMoney(displayClass.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_remain")}</p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                remainingMock <= 0.01 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700"
              }`}
            >
              {formatMoney(remainingMock <= 0.01 ? 0 : remainingMock)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_rate")}</p>
            <p className="mt-1 text-xl font-bold">{ratioPct}%</p>
          </div>
        </div>
      )}

      {displayClass.description.trim() ? (
        <div className="mt-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("adm_class_fiche_description")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{displayClass.description}</p>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg lg:col-span-2">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">{t("adm_class_fiche_trend")}</p>
          </div>
          <div className="h-56 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayClass.chartData}>
                <defs>
                  <linearGradient id={`fiche-${displayClass.id}-g`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Area type="monotone" dataKey="paid" stroke="#6366f1" strokeWidth={2} fill={`url(#fiche-${displayClass.id}-g)`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-card to-violet-500/5 p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_actions")}</p>
            <div className="mt-4 flex flex-col gap-2">
              {canManageClasses ? (
                <>
                  <Button className="w-full justify-between rounded-xl" asChild>
                    <Link href={`${classesBase}/${displayClass.id}/promotion`}>
                      <span className="flex items-center gap-2">
                        <Users className="size-4" />
                        {t("adm_class_fiche_promote_learners")}
                      </span>
                      <ArrowUpRight className="size-4 opacity-80" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-between rounded-xl" asChild>
                    <Link href={`${classesBase}/${displayClass.id}/edit`}>
                      <span className="flex items-center gap-2">
                        <Pencil className="size-4" />
                        {t("adm_class_fiche_edit_class")}
                      </span>
                      <ArrowUpRight className="size-4 opacity-60" />
                    </Link>
                  </Button>
                </>
              ) : null}
              <Button variant="secondary" className="w-full justify-between rounded-xl" asChild>
                <Link href={learnersBase}>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-4" />
                    {t("adm_class_fiche_view_learners")}
                  </span>
                  <ArrowUpRight className="size-4 opacity-60" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CalendarDays className="size-3.5" />
              {t("adm_class_fiche_period")}
            </div>
            <p className="mt-2">
              {t("adm_class_fiche_period_from")} <span className="font-mono text-foreground">{displayClass.periodStart}</span>{" "}
              {t("adm_class_fiche_period_to")}{" "}
              <span className="font-mono text-foreground">{displayClass.periodEnd}</span>
            </p>
            <p className="mt-2">
              {t("adm_class_fiche_status_lbl")}{" "}
              <span className="font-medium text-foreground">
                {displayClass.status === "active"
                  ? t("adm_class_badge_active")
                  : displayClass.status === "finished"
                    ? t("adm_class_badge_finished")
                    : t("adm_class_badge_archived")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
