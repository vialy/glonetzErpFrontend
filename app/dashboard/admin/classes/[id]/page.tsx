"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowUpRight, CalendarDays, GraduationCap, Pencil, School, Users } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { MobileBackButton } from "@/components/mobile-back-button"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { useAdminLearners } from "@/hooks/use-admin-learners"
import { formatFcfa, getClassById } from "@/services/admin-mock.service"

export default function AdminClassFichePage() {
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const classes = useAdminClasses()
  const learners = useAdminLearners()
  const cls = classes.find((c) => c.id === classId) ?? getClassById(classId)
  const countInClass = learners.filter((l) => l.classId === classId).length

  if (!cls) {
    return (
      <div className="px-4 py-10 md:px-6">
        <MobileBackButton fallbackHref="/dashboard/admin/classes" />
        <p className="mt-6 text-muted-foreground">Classe introuvable.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/admin/classes">Retour aux classes</Link>
        </Button>
      </div>
    )
  }

  const ratio = cls.totalDue > 0 ? cls.totalPaid / cls.totalDue : 0
  const remaining = cls.totalDue - cls.totalPaid

  return (
    <div className="min-h-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/admin/classes" />
      <AdminPageHeader
        title={cls.name}
        subtitle={`Session ${cls.session} · ${cls.learnersCount} apprenant(s) reference(s) · ${countInClass} compte(s) rattache(s)`}
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
                Toutes les classes
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pension</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatFcfa(cls.tuitionAmount)}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Encaisse</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{formatFcfa(cls.totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reste attendu</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-rose-700">{formatFcfa(Math.max(0, remaining))}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Taux encaisse</p>
          <p className="mt-1 text-xl font-bold">{Math.round(ratio * 100)}%</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg lg:col-span-2">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">Tendance encaissements (mock)</p>
          </div>
          <div className="h-56 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cls.chartData}>
                <defs>
                  <linearGradient id={`fiche-${cls.id}-g`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatFcfa(v)} />
                <Area type="monotone" dataKey="paid" stroke="#6366f1" strokeWidth={2} fill={`url(#fiche-${cls.id}-g)`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-card to-violet-500/5 p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions rapides</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button className="w-full justify-between rounded-xl" asChild>
                <Link href={`/dashboard/admin/classes/${cls.id}/promotion`}>
                  <span className="flex items-center gap-2">
                    <Users className="size-4" />
                    Promouvoir des apprenants
                  </span>
                  <ArrowUpRight className="size-4 opacity-80" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between rounded-xl" asChild>
                <Link href={`/dashboard/admin/classes/${cls.id}/edit`}>
                  <span className="flex items-center gap-2">
                    <Pencil className="size-4" />
                    Modifier la classe
                  </span>
                  <ArrowUpRight className="size-4 opacity-60" />
                </Link>
              </Button>
              <Button variant="secondary" className="w-full justify-between rounded-xl" asChild>
                <Link href="/dashboard/admin/apprenants">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-4" />
                    Voir les apprenants
                  </span>
                  <ArrowUpRight className="size-4 opacity-60" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CalendarDays className="size-3.5" />
              Periode
            </div>
            <p className="mt-2">
              Du <span className="font-mono text-foreground">{cls.periodStart}</span> au{" "}
              <span className="font-mono text-foreground">{cls.periodEnd}</span>
            </p>
            <p className="mt-2">
              Statut :{" "}
              <span className="font-medium text-foreground">
                {cls.status === "active" ? "Active" : cls.status === "finished" ? "Terminee" : "Archivee"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
