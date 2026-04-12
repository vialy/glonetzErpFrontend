"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, CalendarDays, CreditCard, TrendingUp, Wallet } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { adminExpenses, formatFcfa } from "@/services/admin-mock.service"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { useAdminPayments } from "@/hooks/use-admin-payments"
import { useAdminLearners } from "@/hooks/use-admin-learners"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"

const periods = [
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "90d", label: "Trimestre" },
  { id: "1y", label: "Annee" },
] as const

export function TreasuryContent() {
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("30d")
  const adminPayments = useAdminPayments()
  const adminLearners = useAdminLearners()
  const adminClasses = useAdminClasses()

  const totalDue = useMemo(() => adminClasses.reduce((sum, item) => sum + item.totalDue, 0), [adminClasses])
  const totalPaid = useMemo(() => adminClasses.reduce((sum, item) => sum + item.totalPaid, 0), [adminClasses])
  const managerOut = useMemo(() => adminExpenses.filter((e) => e.type === "manager").reduce((sum, e) => sum + e.amount, 0), [])
  const extraOut = useMemo(() => adminExpenses.filter((e) => e.type === "extra").reduce((sum, e) => sum + e.amount, 0), [])
  const net = totalPaid - managerOut - extraOut
  const pendingClaims = useMemo(() => adminPayments.filter((p) => p.status !== "success").length, [adminPayments])
  const overdueLearners = useMemo(() => adminLearners.filter((l) => l.paid < l.due), [adminLearners])

  const trendData = useMemo(() => {
    return adminClasses[0]?.chartData.map((point, idx) => {
      const out = [42000, 35000, 180000, 95000, 60000][idx] ?? 50000
      return { label: point.label, in: point.paid, out }
    }) ?? []
  }, [adminClasses])

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Dashboard Administrateur"
          subtitle="Pilotage financier global: paiements, charges, impayes, reclamations et solde net theorique."
          gradientClassName="from-primary to-accent"
          actions={
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium">
                <CalendarDays className="size-3.5" />
                <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="bg-transparent outline-none">
                  {periods.map((p) => <option key={p.id} value={p.id} className="text-foreground">{p.label}</option>)}
                </select>
              </div>
              <Link href="/dashboard/admin/rapports" className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary">
                Rapports <ArrowRight className="size-3.5" />
              </Link>
            </div>
          }
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard label="Total du (classes)" value={formatFcfa(totalDue)} icon={<Wallet className="size-4 text-sky-600" />} />
          <AdminKpiCard label="Total encaisse" value={formatFcfa(totalPaid)} hint={`${Math.round((totalPaid / totalDue) * 100)}% du du total`} icon={<TrendingUp className="size-4 text-emerald-600" />} />
          <AdminKpiCard label="Charges totales" value={formatFcfa(managerOut + extraOut)} hint={`Manager ${formatFcfa(managerOut)} + Extra ${formatFcfa(extraOut)}`} icon={<CreditCard className="size-4 text-amber-600" />} />
          <AdminKpiCard label="Solde net theorique" value={formatFcfa(net)} icon={<AlertTriangle className={`size-4 ${net < 0 ? "text-destructive" : "text-violet-600"}`} />} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Revenus vs charges ({periods.find((p) => p.id === period)?.label})</h3>
              <span className="text-xs text-muted-foreground">Vue consolidee</span>
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
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Reclamations a traiter</p>
              <p className="mt-1 text-2xl font-bold">{pendingClaims}</p>
              <Link href="/dashboard/reclamations-validation" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Ouvrir les reclamations <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Apprenants en retard de paiement</p>
              <p className="mt-1 text-2xl font-bold">{overdueLearners.length}</p>
              <Link href="/dashboard/admin/apprenants" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Voir la liste des impayes <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Suivi par classe (du / paye / reste)</h3>
              <Link href="/dashboard/admin/classes" className="text-xs font-medium text-primary">Voir toutes les classes</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Classe</th>
                    <th className="px-3 py-2">Du</th>
                    <th className="px-3 py-2">Paye</th>
                    <th className="px-3 py-2">Reste</th>
                    <th className="px-3 py-2">Progression</th>
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

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Actions rapides admin</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <Link href="/dashboard/admin/classes/nouvelle" className="rounded-lg border px-3 py-2 hover:bg-muted/40">Creer une classe</Link>
              <Link href="/dashboard/admin/apprenants" className="rounded-lg border px-3 py-2 hover:bg-muted/40">Ajouter/importer apprenants</Link>
              <Link href="/dashboard/admin/finances" className="rounded-lg border px-3 py-2 hover:bg-muted/40">Consulter finances globales</Link>
              <Link href="/dashboard/admin/utilisateurs" className="rounded-lg border px-3 py-2 hover:bg-muted/40">Gerer utilisateurs/roles</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
