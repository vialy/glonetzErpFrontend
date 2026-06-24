"use client"

import { Info } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

export type AdminKpiCompactTone = "violet" | "sky" | "emerald" | "amber" | "rose"

const ICON_TONE: Record<AdminKpiCompactTone, string> = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
}

export function AdminKpiCompactTile({
  icon,
  label,
  value,
  unit,
  hint,
  info,
  deltaPct,
  tone = "violet",
  invertDelta = false,
}: {
  icon: ReactNode
  label: string
  value: string
  unit?: string
  hint?: string
  info?: string
  deltaPct?: number | null
  tone?: AdminKpiCompactTone
  invertDelta?: boolean
}) {
  const [valuePulse, setValuePulse] = useState(false)
  const previousValueRef = useRef(value)
  useEffect(() => {
    if (previousValueRef.current === value) return
    previousValueRef.current = value
    setValuePulse(true)
    const timer = window.setTimeout(() => setValuePulse(false), 450)
    return () => window.clearTimeout(timer)
  }, [value])

  const hasDelta = deltaPct !== null && deltaPct !== undefined && Number.isFinite(deltaPct)
  const isGood = hasDelta ? (invertDelta ? deltaPct! <= 0 : deltaPct! >= 0) : true
  const badgeClass = isGood
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <span className="truncate">{label}</span>
          {info ? <Info className="size-3 shrink-0 opacity-70" aria-label={info} /> : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={`tabular-nums text-foreground transition-all duration-300 ${
              valuePulse ? "scale-[1.03] opacity-95" : "scale-100 opacity-100"
            }`}
          >
            <span className="text-lg font-extrabold tracking-tight">{value}</span>
            {unit ? <span className="ml-1 text-[11px] font-medium text-muted-foreground">{unit}</span> : null}
          </span>
          {hasDelta ? (
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${badgeClass}`}>
              {deltaPct! > 0 ? "+" : ""}
              {deltaPct!.toFixed(1)}%
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}
