import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import type { AuditDateRange } from "@/domains/accounting/types"

export type PeriodPreset =
  | "all"
  | "today"
  | "yesterday"
  | "last_7"
  | "last_30"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom"

export type ManagerPeriodFilterValue = {
  preset: PeriodPreset
  /** yyyy-mm-dd */
  customFrom: string
  /** yyyy-mm-dd */
  customTo: string
}

export const defaultManagerPeriodFilter = (): ManagerPeriodFilterValue => ({
  preset: "all",
  customFrom: "",
  customTo: "",
})

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

/**
 * Bornes inclusives pour filtrer des dates ISO (versements, dépenses).
 * `null` = pas de filtre (tout afficher).
 */
export function computePeriodRange(value: ManagerPeriodFilterValue): { start: Date; end: Date } | null {
  const now = new Date()
  const ws = { weekStartsOn: 1 as const }

  if (value.preset === "all") return null

  if (value.preset === "custom") {
    const a = value.customFrom ? parseYmd(value.customFrom) : null
    const b = value.customTo ? parseYmd(value.customTo) : null
    if (!a || !b) return null
    const lo = a <= b ? a : b
    const hi = a <= b ? b : a
    return { start: startOfDay(lo), end: endOfDay(hi) }
  }

  switch (value.preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) }
    case "yesterday": {
      const y = subDays(now, 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case "last_7":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case "last_30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
    case "this_week":
      return { start: startOfWeek(now, ws), end: endOfWeek(now, ws) }
    case "last_week": {
      const ref = subWeeks(now, 1)
      return { start: startOfWeek(ref, ws), end: endOfWeek(ref, ws) }
    }
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case "last_month": {
      const ref = subMonths(now, 1)
      return { start: startOfMonth(ref), end: endOfMonth(ref) }
    }
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now) }
    case "last_year": {
      const ref = subYears(now, 1)
      return { start: startOfYear(ref), end: endOfYear(ref) }
    }
    default:
      return null
  }
}

export function isIsoDateInPeriod(iso: string, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= range.start.getTime() && t <= range.end.getTime()
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Convertit le filtre manager (préréglages + personnalisé) en plage `from`/`to` pour l’audit / rapports admin. */
export function managerFilterToAuditDateRange(value: ManagerPeriodFilterValue): AuditDateRange | null {
  const r = computePeriodRange(value)
  if (!r) return null
  return { from: formatLocalYmd(r.start), to: formatLocalYmd(r.end) }
}
