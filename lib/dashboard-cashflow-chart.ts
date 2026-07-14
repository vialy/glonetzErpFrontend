import { isIsoDateInPeriod } from "@/lib/manager-period-range"

export type DashboardCashflowPoint = {
  label: string
  in: number
  out: number
}

type PaymentLike = {
  createdAt: string
  amount: number
  status: string
}

type ExpenseLike = {
  spentAt: string
  amount: number
}

function ymdFromIso(iso: string): string {
  return iso.slice(0, 10)
}

function pickBucketCount(dayCount: number): number {
  if (dayCount <= 1) return 1
  if (dayCount <= 7) return dayCount
  if (dayCount <= 31) return Math.min(7, Math.ceil(dayCount / 4))
  if (dayCount <= 90) return 6
  return 6
}

function formatBucketLabel(date: Date, locale: "fr" | "en", dayCount: number): string {
  if (dayCount <= 7) {
    return date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      weekday: "short",
      day: "2-digit",
    })
  }
  if (dayCount <= 31) {
    return date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
    })
  }
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    month: "short",
    year: "2-digit",
  })
}

/** Regroupe encaissements et charges du compte principal sur la période sélectionnée. */
export function buildDashboardCashflowChart(params: {
  range: { start: Date; end: Date }
  payments: PaymentLike[]
  expenses: ExpenseLike[]
  locale: "fr" | "en"
}): DashboardCashflowPoint[] {
  const { range, payments, expenses, locale } = params
  const dayCount = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1,
  )
  const bucketCount = pickBucketCount(dayCount)
  const span = range.end.getTime() - range.start.getTime()

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const bucketStart = new Date(range.start.getTime() + (span * i) / bucketCount)
    const bucketEnd =
      i === bucketCount - 1
        ? new Date(range.end)
        : new Date(range.start.getTime() + (span * (i + 1)) / bucketCount - 1)
    return {
      start: bucketStart,
      end: bucketEnd,
      label: formatBucketLabel(bucketStart, locale, dayCount),
      in: 0,
      out: 0,
    }
  })

  for (const payment of payments) {
    if (payment.status !== "success" && payment.status !== "manual") continue
    const ymd = ymdFromIso(payment.createdAt)
    if (!isIsoDateInPeriod(ymd, range)) continue
    const idx = buckets.findIndex((b) => isIsoDateInPeriod(ymd, { start: b.start, end: b.end }))
    if (idx >= 0) buckets[idx].in += payment.amount
  }

  for (const expense of expenses) {
    const ymd = ymdFromIso(expense.spentAt)
    if (!isIsoDateInPeriod(ymd, range)) continue
    const idx = buckets.findIndex((b) => isIsoDateInPeriod(ymd, { start: b.start, end: b.end }))
    if (idx >= 0) buckets[idx].out += expense.amount
  }

  return buckets.map((b) => ({ label: b.label, in: b.in, out: b.out }))
}
