"use client"

import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileClock,
  Home,
  LifeBuoy,
  PieChart as PieChartIcon,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

export function StudentDashboard() {
  const kpis = [
    {
      label: "Scolarite restante",
      value: "450 000 F CFA",
      note: "60% du montant annuel",
      icon: <Wallet className="size-4" />,
      tone: "text-amber-600",
    },
    {
      label: "Deja paye",
      value: "300 000 F CFA",
      note: "2 versements valides",
      icon: <ShieldCheck className="size-4" />,
      tone: "text-emerald-600",
    },
    {
      label: "Prochaine echeance",
      value: "15 Avril 2026",
      note: "150 000 F CFA a regler",
      icon: <CalendarClock className="size-4" />,
      tone: "text-primary",
    },
  ]

  const recentPayments = [
    { label: "Versement mobile money", date: "03 Mars 2026", amount: "100 000 F CFA", status: "Valide" },
    { label: "Paiement guichet", date: "15 Fev 2026", amount: "200 000 F CFA", status: "Valide" },
    { label: "Tentative carte bancaire", date: "10 Fev 2026", amount: "50 000 F CFA", status: "En attente" },
  ]

  const priorityActions = [
    {
      title: "Regler la tranche en attente",
      description: "150 000 F CFA a payer pour rester conforme.",
      href: "/dashboard/effectuer-paiement",
      cta: "Payer maintenant",
    },
    {
      title: "Suivre votre reclamation",
      description: "1 dossier est en cours de traitement.",
      href: "/dashboard/reclamations",
      cta: "Voir mes reclamations",
    },
    {
      title: "Telecharger vos recus",
      description: "Conservez les justificatifs de vos versements.",
      href: "/dashboard/mes-paiements",
      cta: "Acceder aux recus",
    },
  ]

  const adminStatus = [
    { label: "Dossier inscription", value: "Complet", tone: "bg-emerald-500/10 text-emerald-600", icon: <FileCheck2 className="size-3.5" /> },
    { label: "Carte etudiant", value: "Disponible", tone: "bg-emerald-500/10 text-emerald-600", icon: <FileCheck2 className="size-3.5" /> },
    { label: "Attestation de scolarite", value: "A generer", tone: "bg-amber-500/10 text-amber-600", icon: <FileClock className="size-3.5" /> },
  ]

  const paymentChannels = [
    { name: "Mobile Money", value: 52, color: "#2563eb" },
    { name: "Guichet", value: 31, color: "#8b5cf6" },
    { name: "Carte bancaire", value: 17, color: "#14b8a6" },
  ]

  const claimsStatus = [
    { name: "Traitees", value: 3, color: "#16a34a" },
    { name: "En cours", value: 1, color: "#f59e0b" },
    { name: "Rejetees", value: 1, color: "#ef4444" },
  ]

  const strategicLinks = [
    { label: "Payer ma tranche", href: "/dashboard/effectuer-paiement", icon: <CircleDollarSign className="size-4" /> },
    { label: "Suivre mes paiements", href: "/dashboard/mes-paiements", icon: <Receipt className="size-4" /> },
    { label: "Mes reclamations", href: "/dashboard/reclamations", icon: <ClipboardList className="size-4" /> },
    { label: "Mon profil", href: "/dashboard/mon-profil", icon: <UserCircle2 className="size-4" /> },
  ]

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
          <div className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold md:text-2xl text-balance">Espace Etudiant</h1>
                <nav className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/70">
                  <Home className="size-3.5" />
                  <ChevronRight className="size-3" />
                  <span>Dashboard</span>
                </nav>
              </div>

              <Link
                href="/dashboard/effectuer-paiement"
                className="mt-2 inline-flex items-center gap-2 self-start rounded-lg bg-primary-foreground/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-primary-foreground/30 sm:mt-0"
              >
                <Sparkles className="size-4" />
                Effectuer un paiement
              </Link>
            </div>
          </div>
          <div className="bg-black/10 px-5 py-3 text-xs text-primary-foreground/90">
            Vue claire des frais a payer, echeances a venir et historique de vos versements.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <div className="rounded-md bg-primary/10 p-1.5 text-primary">{kpi.icon}</div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className={`mt-1 text-xs font-medium ${kpi.tone}`}>{kpi.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <LifeBuoy className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Menu etudiant</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {strategicLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span className="inline-flex items-center gap-2 text-foreground">
                  {item.icon}
                  {item.label}
                </span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChartIcon className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Canaux de paiement</h3>
              </div>
              <span className="text-xs text-muted-foreground">Ce semestre</span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentChannels} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={2}>
                    {paymentChannels.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {paymentChannels.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Etat des reclamations</h3>
              </div>
              <span className="text-xs text-muted-foreground">5 dossiers</span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={claimsStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={3}>
                    {claimsStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} dossier(s)`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {claimsStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Actions prioritaires</h3>
              <span className="text-xs text-muted-foreground">Ce que vous devez faire maintenant</span>
            </div>
            <div className="space-y-3">
              {priorityActions.map((action) => (
                <div key={action.title} className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                  <Link
                    href={action.href}
                    className="mt-2 inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {action.cta}
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileCheck2 className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Statut administratif</h3>
            </div>
            <div className="space-y-3">
              {adminStatus.map((item) => (
                <div key={item.label} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.tone}`}>
                    {item.icon}
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Paiements recents</h3>
            </div>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={`${payment.label}-${payment.date}`} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{payment.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        payment.status === "Valide"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{payment.date}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{payment.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Alertes utiles</h3>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>- Echeance principale dans 18 jours.</p>
                <p>- 2 paiements restants pour solder l'annee.</p>
                <p>- Pensez a telecharger vos recus apres chaque paiement.</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Actions rapides</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/effectuer-paiement"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  Payer maintenant
                </Link>
                <Link
                  href="/dashboard/mes-paiements"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  Voir mes paiements
                </Link>
                <Link
                  href="/dashboard/reclamations"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  Faire une reclamation
                </Link>
                <Link
                  href="/dashboard/mon-profil"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  Mettre a jour profil
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
