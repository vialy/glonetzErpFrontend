"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileClock,
  Home,
  PieChart as PieChartIcon,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { paymentsService, type StudentTuitionSummary } from "@/domains/payments"
import { useLocale } from "@/hooks/use-locale"

export function StudentDashboard() {
  const { t, locale } = useLocale()
  const [summary, setSummary] = useState<StudentTuitionSummary>({
    studentName: "Etudiant Demo",
    className: "A1",
    totalTuition: 0,
    amountPaid: 0,
    remainingAmount: 0,
  })

  const formatFcfa = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} F CFA`

  useEffect(() => {
    const refresh = async () => setSummary(await paymentsService.getSummary())
    void refresh()
    window.addEventListener("student-payments-updated", refresh)
    return () => window.removeEventListener("student-payments-updated", refresh)
  }, [])

  const paymentProgress = useMemo(() => {
    if (summary.totalTuition <= 0) return 0
    return Math.min(100, Math.round((summary.amountPaid / summary.totalTuition) * 100))
  }, [summary.amountPaid, summary.totalTuition])

  const kpis = useMemo(
    () => [
      {
        label: t("stu_kpi_tuition"),
        value: formatFcfa(summary.remainingAmount),
        note:
          summary.totalTuition > 0
            ? `${100 - paymentProgress}% ${t("stu_kpi_tuition_note")}`
            : t("stu_kpi_tuition_note"),
        icon: <Wallet className="size-4" />,
        valueTone: "text-destructive",
        iconTone: "bg-destructive/10 text-destructive",
        noteTone: "text-destructive/80",
      },
      {
        label: t("stu_kpi_paid"),
        value: formatFcfa(summary.amountPaid),
        note: t("stu_kpi_paid_note"),
        icon: <ShieldCheck className="size-4" />,
        valueTone: "text-emerald-600 dark:text-emerald-400",
        iconTone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        noteTone: "text-emerald-600/80 dark:text-emerald-400/80",
      },
      {
        label: t("stu_kpi_next"),
        value: "15 Avril 2026",
        note: t("stu_kpi_next_note"),
        icon: <CalendarClock className="size-4"/>,
        valueTone: "text-foreground",
        iconTone: "bg-primary/10 text-primary",
        noteTone: "text-primary",
      },
    ],
    [t, summary, formatFcfa, paymentProgress],
  )

  const recentPayments = useMemo(
    () => [
      { label: t("stu_pay_mobile"), date: "03 Mars 2026", amount: "100 000 F CFA", status: t("stu_status_ok") },
      { label: t("stu_pay_desk"), date: "15 Fev 2026", amount: "200 000 F CFA", status: t("stu_status_ok") },
      { label: t("stu_pay_card_try"), date: "10 Fev 2026", amount: "50 000 F CFA", status: t("stu_status_wait") },
    ],
    [t],
  )

  const adminStatus = useMemo(
    () => [
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
      { name: t("sp_method_mtn"), value: 45, color: "#FFCC00" },
      { name: t("sp_method_om"), value: 35, color: "#FF6600" },
      { name: t("sp_method_cash"), value: 20, color: "#6366f1" },
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
                <div className={`rounded-md p-1.5 ${kpi.iconTone}`}>{kpi.icon}</div>
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${kpi.valueTone}`}>{kpi.value}</p>
              <p className={`mt-1 text-xs font-medium ${kpi.noteTone}`}>{kpi.note}</p>
            </div>
          ))}
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

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("stu_pay_recent")}</h3>
              </div>
              <Link
                href="/dashboard/mes-paiements"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t("stu_link_payments")}
                <ChevronRight className="size-3" />
              </Link>
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
              <div className="mb-3 flex items-center gap-2">
                <FileClock className="size-4 text-primary" />
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
          </div>
        </div>
      </div>
    </div>
  )
}
