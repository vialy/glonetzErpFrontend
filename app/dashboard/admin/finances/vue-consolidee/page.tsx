"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BadgeDollarSign, Sparkles } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatFcfa } from "@/services/admin-mock.service"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"

export default function FinanceOverviewPage() {
  const { t } = useLocale()
  const { operations, consolidatedTheoretical, consolidatedRealRemaining } = useFinanceContext()
  const consumedGap = Math.max(consolidatedRealRemaining - consolidatedTheoretical, 0)
  const [theoreticalPulse, setTheoreticalPulse] = useState(false)
  const [realPulse, setRealPulse] = useState(false)
  const previousTheoreticalRef = useRef(consolidatedTheoretical)
  const previousRealRef = useRef(consolidatedRealRemaining)

  useEffect(() => {
    if (previousTheoreticalRef.current === consolidatedTheoretical) return
    previousTheoreticalRef.current = consolidatedTheoretical
    setTheoreticalPulse(true)
    const timer = window.setTimeout(() => setTheoreticalPulse(false), 450)
    return () => window.clearTimeout(timer)
  }, [consolidatedTheoretical])

  useEffect(() => {
    if (previousRealRef.current === consolidatedRealRemaining) return
    previousRealRef.current = consolidatedRealRemaining
    setRealPulse(true)
    const timer = window.setTimeout(() => setRealPulse(false), 450)
    return () => window.clearTimeout(timer)
  }, [consolidatedRealRemaining])

  const trend = useMemo(() => {
    const months = [t("fin_overview_m1"), t("fin_overview_m2"), t("fin_overview_m3"), t("fin_overview_m4"), t("fin_overview_m5"), t("fin_overview_m6")]
    const inOps = operations.filter((o) => o.type === "inflow").reduce((sum, o) => sum + o.amount, 0)
    const outOps = operations.filter((o) => o.type !== "inflow").reduce((sum, o) => sum + o.amount, 0)
    return months.map((month, idx) => ({
      month,
      in: 500000 + (idx === months.length - 1 ? inOps : 0),
      out: 180000 + (idx === months.length - 1 ? outOps : 0),
    }))
  }, [operations, t])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] via-card to-card p-3.5 shadow-sm">
          <div className="absolute -right-7 -top-7 size-24 rounded-full bg-violet-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("fin_kpi_theoretical")}</p>
              <span className="inline-flex rounded-xl bg-violet-500/10 p-1.5 text-violet-700 dark:text-violet-300">
                <BadgeDollarSign className="size-4" />
              </span>
            </div>
            <p
              className={`mt-1.5 text-[1.55rem] font-extrabold tabular-nums transition-all duration-300 ${
                theoreticalPulse ? "scale-[1.03] opacity-95" : "scale-100 opacity-100"
              }`}
            >
              {formatFcfa(consolidatedTheoretical)}
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] via-card to-card p-3.5 shadow-sm">
          <div className="absolute -right-7 -top-7 size-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("fin_kpi_real")}</p>
              <span className="inline-flex rounded-xl bg-emerald-500/10 p-1.5 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="size-4" />
              </span>
            </div>
            <p
              className={`mt-1.5 text-[1.55rem] font-extrabold tabular-nums text-emerald-700 transition-all duration-300 dark:text-emerald-400 ${
                realPulse ? "scale-[1.03] opacity-95" : "scale-100 opacity-100"
              }`}
            >
              {formatFcfa(consolidatedRealRemaining)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("fin_kpi_gap")}: {formatFcfa(consumedGap)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <p className="mb-2 text-sm font-semibold">{t("fin_overview_title")}</p>
      <div className="h-60 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.03} /></linearGradient>
              <linearGradient id="out" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0.03} /></linearGradient>
            </defs>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatFcfa(value)} />
            <Area type="monotone" dataKey="in" stroke="#10b981" fill="url(#in)" />
            <Area type="monotone" dataKey="out" stroke="#f97316" fill="url(#out)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  )
}
