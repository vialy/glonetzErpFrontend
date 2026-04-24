"use client"

import { useMemo } from "react"
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
import { useLocale } from "@/hooks/use-locale"

export function StudentDashboard() {
  const { t } = useLocale()

  const kpis = useMemo(
    () => [
      {
        label: t("stu_kpi_tuition"),
        value: "450 000 F CFA",
        note: t("stu_kpi_tuition_note"),
        icon: <Wallet className="size-4" />,
        tone: "text-amber-600",
      },
      {
        label: t("stu_kpi_paid"),
        value: "300 000 F CFA",
        note: t("stu_kpi_paid_note"),
        icon: <ShieldCheck className="size-4" />,
        tone: "text-emerald-600",
      },
      {
        label: t("stu_kpi_next"),
        value: "15 Avril 2026",
        note: t("stu_kpi_next_note"),
        icon: <CalendarClock className="size-4" />,
        tone: "text-primary",
      },
    ],
    [t],
  )

  const recentPayments = useMemo(
    () => [
      { label: t("stu_pay_mobile"), date: "03 Mars 2026", amount: "100 000 F CFA", status: t("stu_status_ok") },
      { label: t("stu_pay_desk"), date: "15 Fev 2026", amount: "200 000 F CFA", status: t("stu_status_ok") },
      { label: t("stu_pay_card_try"), date: "10 Fev 2026", amount: "50 000 F CFA", status: t("stu_status_wait") },
    ],
    [t],
  )

  const priorityActions = useMemo(
    () => [
      {
        title: t("stu_pri1_title"),
        description: t("stu_pri1_desc"),
        href: "/dashboard/effectuer-paiement",
        cta: t("stu_pri1_cta"),
      },
      {
        title: t("stu_pri2_title"),
        description: t("stu_pri2_desc"),
        href: "/dashboard/reclamations",
        cta: t("stu_pri2_cta"),
      },
      {
        title: t("stu_pri3_title"),
        description: t("stu_pri3_desc"),
        href: "/dashboard/mes-paiements",
        cta: t("stu_pri3_cta"),
      },
    ],
    [t],
  )

  const adminStatus = useMemo(
    () => [
      {
        label: t("stu_adm_dossier"),
        value: t("stu_adm_complete"),
        tone: "bg-emerald-500/10 text-emerald-600",
        icon: <FileCheck2 className="size-3.5" />,
      },
      {
        label: t("stu_adm_card"),
        value: t("stu_adm_available"),
        tone: "bg-emerald-500/10 text-emerald-600",
        icon: <FileCheck2 className="size-3.5" />,
      },
      {
        label: t("stu_adm_attest"),
        value: t("stu_adm_todo"),
        tone: "bg-amber-500/10 text-amber-600",
        icon: <FileClock className="size-3.5" />,
      },
    ],
    [t],
  )

  const paymentChannels = useMemo(
    () => [
      { name: t("stu_ch_momo"), value: 52, color: "#2563eb" },
      { name: t("stu_ch_desk"), value: 31, color: "#8b5cf6" },
      { name: t("stu_ch_card"), value: 17, color: "#14b8a6" },
    ],
    [t],
  )

  const claimsStatus = useMemo(
    () => [
      { name: t("stu_cl_done"), value: 3, color: "#16a34a" },
      { name: t("stu_cl_prog"), value: 1, color: "#f59e0b" },
      { name: t("stu_cl_rej"), value: 1, color: "#ef4444" },
    ],
    [t],
  )

  const strategicLinks = useMemo(
    () => [
      { label: t("stu_link_pay_tranche"), href: "/dashboard/effectuer-paiement", icon: <CircleDollarSign className="size-4" /> },
      { label: t("stu_link_payments"), href: "/dashboard/mes-paiements", icon: <Receipt className="size-4" /> },
      { label: t("stu_link_claims"), href: "/dashboard/reclamations", icon: <ClipboardList className="size-4" /> },
      { label: t("stu_link_profile"), href: "/dashboard/mon-profil", icon: <UserCircle2 className="size-4" /> },
    ],
    [t],
  )

  const statusValid = t("stu_status_ok")

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
          <div className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold md:text-2xl text-balance">{t("stu_space_title")}</h1>
                <nav className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/70">
                  <Home className="size-3.5" />
                  <ChevronRight className="size-3" />
                  <span>{t("stu_breadcrumb_dashboard")}</span>
                </nav>
              </div>

              <Link
                href="/dashboard/effectuer-paiement"
                className="mt-2 inline-flex items-center gap-2 self-start rounded-lg bg-primary-foreground/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-primary-foreground/30 sm:mt-0"
              >
                <Sparkles className="size-4" />
                {t("stu_header_pay")}
              </Link>
            </div>
          </div>
          <div className="bg-black/10 px-5 py-3 text-xs text-primary-foreground/90">{t("stu_hero_sub")}</div>
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
            <h3 className="text-sm font-semibold">{t("stu_menu_title")}</h3>
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
                <h3 className="text-sm font-semibold">{t("stu_pie_pay_title")}</h3>
              </div>
              <span className="text-xs text-muted-foreground">{t("stu_pie_semester")}</span>
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
                <h3 className="text-sm font-semibold">{t("stu_pie_claim_title")}</h3>
              </div>
              <span className="text-xs text-muted-foreground">{t("stu_pie_claim_count")}</span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={claimsStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={3}>
                    {claimsStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} ${t("stu_claim_tip")}`} />
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
              <h3 className="text-sm font-semibold">{t("stu_act_priority")}</h3>
              <span className="text-xs text-muted-foreground">{t("stu_act_priority_sub")}</span>
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
              <h3 className="text-sm font-semibold">{t("stu_adm_status")}</h3>
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
              <h3 className="text-sm font-semibold">{t("stu_pay_recent")}</h3>
            </div>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={`${payment.label}-${payment.date}`} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{payment.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        payment.status === statusValid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
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
                <h3 className="text-sm font-semibold">{t("stu_alerts")}</h3>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{t("stu_alert_1")}</p>
                <p>{t("stu_alert_2")}</p>
                <p>{t("stu_alert_3")}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">{t("stu_quick_title")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/effectuer-paiement"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  {t("stu_quick_pay")}
                </Link>
                <Link
                  href="/dashboard/mes-paiements"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  {t("stu_quick_list")}
                </Link>
                <Link
                  href="/dashboard/reclamations"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  {t("stu_quick_claim")}
                </Link>
                <Link
                  href="/dashboard/mon-profil"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  {t("stu_quick_profile")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
