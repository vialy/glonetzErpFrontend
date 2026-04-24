"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export function AdminKpiCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  featured = false,
  compact = false,
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: "default" | "success" | "warning" | "danger" | "violet"
  featured?: boolean
  compact?: boolean
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 from-emerald-500/[0.10] via-card to-card"
      : tone === "warning"
        ? "border-amber-500/20 from-amber-500/[0.10] via-card to-card"
        : tone === "danger"
          ? "border-rose-500/20 from-rose-500/[0.10] via-card to-card"
          : tone === "violet"
            ? "border-violet-500/20 from-violet-500/[0.10] via-card to-card"
            : "border-primary/10 from-primary/[0.08] via-card to-card"

  const iconToneClass =
    tone === "success"
      ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-700 bg-amber-500/10 dark:text-amber-300"
        : tone === "danger"
          ? "text-rose-700 bg-rose-500/10 dark:text-rose-300"
          : tone === "violet"
            ? "text-violet-700 bg-violet-500/10 dark:text-violet-300"
            : "text-primary bg-primary/10"

  const [valuePulse, setValuePulse] = useState(false)
  const previousValueRef = useRef(value)

  useEffect(() => {
    if (previousValueRef.current === value) return
    previousValueRef.current = value
    setValuePulse(true)
    const timer = window.setTimeout(() => setValuePulse(false), 450)
    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${toneClass} ${
        featured ? "md:p-4" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        {icon ? <span className={`inline-flex rounded-xl p-1.5 ${iconToneClass}`}>{icon}</span> : null}
      </div>
      <p
        className={`mt-1.5 tabular-nums text-foreground transition-all duration-300 ${
          featured
            ? compact
              ? "text-[1.4rem] font-extrabold"
              : "text-[1.55rem] font-extrabold"
            : compact
              ? "text-[1.2rem] font-bold"
              : "text-[1.35rem] font-bold"
        } ${valuePulse ? "scale-[1.03] opacity-95" : "scale-100 opacity-100"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

