"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowUpRight, CalendarDays, GraduationCap, Loader2, Pencil, School, Users } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { MobileBackButton } from "@/components/mobile-back-button"
import { classesService, type StaffClass, type StaffClassStats } from "@/domains/classes"
import { enrichClassWithLearnerStats } from "@/domains/classes/enrich-classes"
import { useAdminLearnersQuery } from "@/hooks/use-admin-learners"
import { getClassById } from "@/services/admin-mock.service"
import { useLocale } from "@/hooks/use-locale"
import { isApiDataProvider } from "@/lib/data-provider"

export default function AdminClassFichePage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const { learners } = useAdminLearnersQuery()
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
    // Le back-end est la source autoritaire : du = totalExpected, encaisse = totalPaid.
    return {
      ...enriched,
      learnersCount: stats.studentCount || enriched.learnersCount,
      totalDue: stats.totalExpected,
      totalPaid: stats.totalPaid,
    }
  }, [cls, countInClass, stats])

  if (loadingDetail) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground md:px-6">
        <Loader2 className="size-4 animate-spin" />
        {t("adm_set_loading")}
      </div>
    )
  }

  if (!displayClass) {
    return (
      <div className="px-4 py-10 md:px-6">
        <MobileBackButton fallbackHref="/dashboard/admin/classes" />
        <p className="mt-6 text-muted-foreground">{t("adm_class_fiche_notfound")}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/admin/classes">{t("adm_class_fiche_back")}</Link>
        </Button>
      </div>
    )
  }

  const ratio = displayClass.totalDue > 0 ? displayClass.totalPaid / displayClass.totalDue : 0
  // Evite d'afficher 0% quand un montant non nul est encaisse (petit ratio arrondi).
  const ratioPct = displayClass.totalPaid > 0 ? Math.max(1, Math.round(ratio * 100)) : 0
  const remaining = displayClass.totalDue - displayClass.totalPaid

  return (
    <div className="min-h-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/admin/classes" />
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
              <Link href="/dashboard/admin/classes">
                <School className="mr-2 size-3.5" />
                {t("adm_class_fiche_all_classes")}
              </Link>
            </Button>
          </div>
        }
      />

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
          <p className="mt-1 text-xl font-bold tabular-nums text-rose-700">{formatMoney(Math.max(0, remaining))}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("adm_class_fiche_rate")}</p>
          <p className="mt-1 text-xl font-bold">{ratioPct}%</p>
        </div>
      </div>

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
              <Button className="w-full justify-between rounded-xl" asChild>
                <Link href={`/dashboard/admin/classes/${displayClass.id}/promotion`}>
                  <span className="flex items-center gap-2">
                    <Users className="size-4" />
                    {t("adm_class_fiche_promote_learners")}
                  </span>
                  <ArrowUpRight className="size-4 opacity-80" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between rounded-xl" asChild>
                <Link href={`/dashboard/admin/classes/${displayClass.id}/edit`}>
                  <span className="flex items-center gap-2">
                    <Pencil className="size-4" />
                    {t("adm_class_fiche_edit_class")}
                  </span>
                  <ArrowUpRight className="size-4 opacity-60" />
                </Link>
              </Button>
              <Button variant="secondary" className="w-full justify-between rounded-xl" asChild>
                <Link href="/dashboard/admin/apprenants">
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
