"use client"

import { useEffect, useState } from "react"
import { GraduationCap, ArrowRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatTimelineDate,
  getTimelineEntryDisplay,
  sourceLabel,
  type LearnerClassTimelineEntry,
} from "@/lib/learner-class-timeline"
import { fetchLearnerClassTimeline } from "@/services/class-timeline.service"
import { isApiDataProvider } from "@/lib/data-provider"

function TimelineRow({
  entry,
  formatFcfa,
  locale,
  financialLabels,
}: {
  entry: LearnerClassTimelineEntry
  formatFcfa: (n: number) => string
  locale?: string
  financialLabels: {
    catalogTuition: string
    scholarship: string
    netDue: string
    scholarshipFull: string
    scholarshipBadgeFull: string
    scholarshipBadgePartial: string
    tuition: string
    paid: string
    remaining: string
    payments: string
  }
}) {
  const { remaining, ratio, hasFinancialOverlay, hasScholarshipBreakdown } =
    getTimelineEntryDisplay(entry)

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={`z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${
            entry.isCurrent
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-muted-foreground/30 bg-card text-muted-foreground"
          }`}
        >
          <GraduationCap className="size-4" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      <div
        className={`min-w-0 flex-1 rounded-xl border p-4 ${
          entry.isCurrent ? "border-violet-300/60 bg-violet-50/50 dark:bg-violet-950/20" : "bg-card"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{entry.className}</p>
            <p className="text-xs text-muted-foreground">
              {formatTimelineDate(entry.periodStart, locale)}
              {entry.periodStart || entry.periodEnd ? " → " : ""}
              {formatTimelineDate(entry.periodEnd, locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{sourceLabel(entry.source)}</span>
            {entry.isCurrent ? (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-800">
                Classe actuelle
              </span>
            ) : entry.leftAt ? (
              <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-muted-foreground">
                Terminée
              </span>
            ) : null}
            {hasScholarshipBreakdown ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-800">
                {entry.scholarshipIsFull
                  ? financialLabels.scholarshipBadgeFull
                  : financialLabels.scholarshipBadgePartial}
              </span>
            ) : null}
          </div>
        </div>

        {entry.scholarshipIsFull && hasScholarshipBreakdown ? (
          <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
            {financialLabels.scholarshipFull}
          </p>
        ) : null}

        {hasScholarshipBreakdown && !entry.scholarshipIsFull ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{financialLabels.catalogTuition}</p>
              <p className="font-semibold tabular-nums">{formatFcfa(entry.tuitionDue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{financialLabels.scholarship}</p>
              <p className="font-semibold tabular-nums text-sky-700">
                −{formatFcfa(entry.scholarshipDiscount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{financialLabels.netDue}</p>
              <p className="font-semibold tabular-nums">{formatFcfa(entry.netExpected ?? 0)}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {!hasScholarshipBreakdown ? (
            <div>
              <p className="text-xs text-muted-foreground">{financialLabels.tuition}</p>
              <p className="font-semibold tabular-nums">{formatFcfa(entry.tuitionDue)}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">{financialLabels.paid}</p>
            <p className="font-semibold tabular-nums text-emerald-700">{formatFcfa(entry.amountPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{financialLabels.remaining}</p>
            <p
              className={`font-semibold tabular-nums ${
                remaining <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700"
              }`}
            >
              {formatFcfa(remaining <= 0 ? 0 : remaining)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{financialLabels.payments}</p>
            <p className="font-semibold">{entry.paymentCount}</p>
          </div>
        </div>

        {entry.tuitionDue > 0 || hasFinancialOverlay ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${entry.isCurrent ? "bg-violet-500" : "bg-emerald-500"}`}
              style={{ width: `${ratio}%` }}
            />
          </div>
        ) : null}

        <p className="mt-2 text-xs text-muted-foreground">
          Depuis le {formatTimelineDate(entry.enrolledAt, locale)}
          {entry.leftAt ? ` · jusqu'au ${formatTimelineDate(entry.leftAt, locale)}` : ""}
        </p>
      </div>
    </div>
  )
}

export function LearnerClassTimeline({
  learnerId,
  formatFcfa,
  locale = "fr-FR",
  title = "Parcours de formation",
  subtitle = "Historique des classes et montants payés par période.",
  financialLabels = {
    catalogTuition: "Pension catalogue",
    scholarship: "Bourse",
    netDue: "Dû net",
    scholarshipFull: "Bourse complète — aucun reste à payer.",
    scholarshipBadgeFull: "Boursier (complète)",
    scholarshipBadgePartial: "Boursier (partielle)",
    tuition: "Pension",
    paid: "Payé",
    remaining: "Reste",
    payments: "Paiements",
  },
}: {
  learnerId: string
  formatFcfa: (n: number) => string
  locale?: string
  title?: string
  subtitle?: string
  financialLabels?: {
    catalogTuition: string
    scholarship: string
    netDue: string
    scholarshipFull: string
    scholarshipBadgeFull: string
    scholarshipBadgePartial: string
    tuition: string
    paid: string
    remaining: string
    payments: string
  }
}) {
  const [entries, setEntries] = useState<LearnerClassTimelineEntry[]>([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isApiDataProvider()) {
      setEntries([])
      setTotalPaid(0)
      setLoading(false)
      return
    }

    let cancelled = false

    const refresh = async () => {
      setLoading(true)
      try {
        const timeline = await fetchLearnerClassTimeline(learnerId)
        if (!cancelled) {
          setEntries(timeline.entries)
          setTotalPaid(timeline.totalPaid)
        }
      } catch {
        if (!cancelled) {
          setEntries([])
          setTotalPaid(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void refresh()
    window.addEventListener("admin-learners-updated", refresh)
    window.addEventListener("admin-scholarships-updated", refresh)
    window.addEventListener("admin-payments-updated", refresh)
    return () => {
      cancelled = true
      window.removeEventListener("admin-learners-updated", refresh)
      window.removeEventListener("admin-scholarships-updated", refresh)
      window.removeEventListener("admin-payments-updated", refresh)
    }
  }, [learnerId])

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ArrowRight className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <p className="text-sm tabular-nums">
          <span className="text-muted-foreground">Total payé (toutes classes) : </span>
          <span className="font-semibold text-emerald-700">{formatFcfa(totalPaid)}</span>
        </p>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun parcours enregistré pour cet apprenant.
          </p>
        ) : (
          <div className="pl-1">
            {entries.map((entry) => (
              <TimelineRow
                key={entry.enrollmentId}
                entry={entry}
                formatFcfa={formatFcfa}
                locale={locale}
                financialLabels={financialLabels}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
