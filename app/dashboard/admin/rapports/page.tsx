"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, FileDown, GraduationCap, Loader2, Receipt } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ClassSearchSelect } from "@/components/admin/class-search-select"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useLocale } from "@/hooks/use-locale"
import {
  buildChargesReport,
  buildChargesReportCsv,
  buildClassLearnerReport,
  buildClassReportCsv,
  buildPeriodFinancialSummary,
  downloadChargesReportPdf,
  downloadClassReportPdf,
  downloadCsvFile,
  type ChargesReport,
  type ClassLearnerReport,
  type PeriodFinancialSummary,
} from "@/lib/admin-reports"
import { formatFcfa } from "@/lib/audit-date-range"
import { managerFilterToAuditDateRange, type ManagerPeriodFilterValue } from "@/lib/manager-period-range"

const defaultPeriodFilter = (): ManagerPeriodFilterValue => ({
  preset: "last_30",
  customFrom: "",
  customTo: "",
})

type ExportKind = "class-csv" | "class-pdf" | "charges-csv" | "charges-pdf"

export default function AdminReportsPage() {
  const { t, locale } = useLocale()
  const { classes, loading: classesLoading } = useAdminClassesQuery()
  const [periodFilter, setPeriodFilter] = useState<ManagerPeriodFilterValue>(defaultPeriodFilter)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [classReport, setClassReport] = useState<ClassLearnerReport | null>(null)
  const [classReportLoading, setClassReportLoading] = useState(false)
  const [classReportError, setClassReportError] = useState<string | null>(null)
  const [chargesReport, setChargesReport] = useState<ChargesReport | null>(null)
  const [periodSummary, setPeriodSummary] = useState<PeriodFinancialSummary | null>(null)
  const [chargesLoading, setChargesLoading] = useState(false)
  const [busy, setBusy] = useState<ExportKind | null>(null)

  const auditRange = useMemo(() => managerFilterToAuditDateRange(periodFilter), [periodFilter])
  const classOptions = useMemo(() => classes.map((c) => ({ id: c.id, name: c.name })), [classes])

  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`

  const periodSummaryLabel =
    auditRange ? (
      <span>
        {auditRange.from} → {auditRange.to}
      </span>
    ) : null

  useEffect(() => {
    if (!selectedClassId) {
      setClassReport(null)
      setClassReportError(null)
      return
    }

    let cancelled = false
    setClassReportLoading(true)
    setClassReportError(null)

    buildClassLearnerReport(selectedClassId)
      .then((report) => {
        if (cancelled) return
        if (!report) {
          setClassReport(null)
          setClassReportError(t("adm_rep_class_not_found"))
          return
        }
        setClassReport(report)
      })
      .catch(() => {
        if (!cancelled) {
          setClassReport(null)
          setClassReportError(t("data_error_desc"))
        }
      })
      .finally(() => {
        if (!cancelled) setClassReportLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedClassId, t])

  useEffect(() => {
    if (!auditRange) {
      setChargesReport(null)
      setPeriodSummary(null)
      return
    }

    let cancelled = false
    setChargesLoading(true)

    Promise.all([buildChargesReport(auditRange)])
      .then(([charges]) => {
        if (cancelled) return
        setChargesReport(charges)
        setPeriodSummary({
          totalPaymentsIn: charges.totals.paymentsIn,
          totalManagerExpenses: charges.totals.manager,
          totalExtraordinaryExpenses: charges.totals.extraordinary,
          theoreticalNetBalance: charges.totals.netBalance,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setChargesReport(null)
          setPeriodSummary(null)
        }
      })
      .finally(() => {
        if (!cancelled) setChargesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [auditRange])

  const exportClassCsv = useCallback(() => {
    if (!classReport) return
    setBusy("class-csv")
    try {
      downloadCsvFile(`rapport-classe-${classReport.classId}.csv`, buildClassReportCsv(classReport))
      toast({ title: t("adm_rep_export_done"), description: classReport.className })
    } finally {
      setBusy(null)
    }
  }, [classReport, t])

  const exportClassPdf = useCallback(async () => {
    if (!classReport) return
    setBusy("class-pdf")
    try {
      await downloadClassReportPdf(classReport)
      toast({ title: t("adm_rep_export_done"), description: classReport.className })
    } finally {
      setBusy(null)
    }
  }, [classReport, t])

  const exportChargesCsv = useCallback(() => {
    if (!chargesReport || !auditRange) return
    setBusy("charges-csv")
    try {
      downloadCsvFile(
        `rapport-charges-${auditRange.from}-${auditRange.to}.csv`,
        buildChargesReportCsv(chargesReport),
      )
      toast({ title: t("adm_rep_export_done"), description: `${auditRange.from} → ${auditRange.to}` })
    } finally {
      setBusy(null)
    }
  }, [auditRange, chargesReport, t])

  const exportChargesPdf = useCallback(async () => {
    if (!chargesReport || !auditRange) return
    setBusy("charges-pdf")
    try {
      await downloadChargesReportPdf(chargesReport)
      toast({ title: t("adm_rep_export_done"), description: `${auditRange.from} → ${auditRange.to}` })
    } finally {
      setBusy(null)
    }
  }, [auditRange, chargesReport, t])

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_rep_page_title")}
        subtitle={t("adm_rep_page_sub")}
        gradientClassName="from-fuchsia-600 to-indigo-600"
      />

      <section className="mt-8 rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{t("adm_rep_class_section_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("adm_rep_class_section_desc")}</p>
          </div>
        </div>

        <div className="mt-4 max-w-md">
          {classesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <ClassSearchSelect
              value={selectedClassId || "all"}
              onValueChange={(value) => setSelectedClassId(value === "all" ? "" : value)}
              options={classOptions}
              allLabel={t("adm_rep_class_pick")}
              searchPlaceholder={t("adm_class_search_placeholder")}
              emptyLabel={t("adm_class_search_empty")}
              moreResultsLabel={t("adm_class_search_more")}
            />
          )}
        </div>

        {!selectedClassId ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("adm_rep_class_pick_hint")}</p>
        ) : null}

        {classReportLoading ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {classReportError ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {classReportError}
          </p>
        ) : null}

        {classReport && !classReportLoading ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={exportClassCsv}
              >
                {busy === "class-csv" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {t("acc_export_csv")}
              </Button>
              <Button type="button" size="sm" disabled={busy !== null} onClick={() => void exportClassPdf()}>
                {busy === "class-pdf" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 size-4" />
                )}
                {t("acc_export_pdf")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("adm_rep_class_count").replace("{n}", String(classReport.learners.length))}
              </span>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adm_rep_col_learner")}</TableHead>
                    <TableHead>{t("adm_rep_col_phone")}</TableHead>
                    <TableHead className="text-right">{t("adm_rep_col_due")}</TableHead>
                    <TableHead className="text-right">{t("adm_rep_col_paid")}</TableHead>
                    <TableHead className="text-right">{t("adm_rep_col_remaining")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classReport.learners.map((learner) => (
                    <TableRow key={learner.learnerId}>
                      <TableCell className="font-medium">{learner.fullName}</TableCell>
                      <TableCell>{learner.phone}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(learner.due)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {formatMoney(learner.paid)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            learner.remaining <= 0.01
                              ? "font-medium text-emerald-700 dark:text-emerald-400"
                              : "font-semibold text-rose-700"
                          }
                        >
                          {formatMoney(learner.remaining <= 0.01 ? 0 : learner.remaining)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-4 text-sm tabular-nums">
              <span>
                {t("adm_rep_col_due")} : <strong>{formatMoney(classReport.totals.due)}</strong>
              </span>
              <span>
                {t("adm_rep_col_paid")} : <strong>{formatMoney(classReport.totals.paid)}</strong>
              </span>
              <span>
                {t("adm_rep_col_remaining")} : <strong>{formatMoney(classReport.totals.remaining)}</strong>
              </span>
            </div>
          </>
        ) : null}
      </section>

      <section className="mt-8 rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Receipt className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{t("adm_rep_charges_section_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("adm_rep_charges_section_desc")}</p>
          </div>
        </div>

        <div className="mt-4">
          <ManagerPeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            hint={t("adm_rep_filter_hint")}
            summary={periodSummaryLabel}
          />
        </div>

        {!auditRange ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("adm_rep_need_period")}
          </p>
        ) : null}

        {chargesLoading && auditRange ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {periodSummary && auditRange && !chargesLoading ? (
          <>
            <section className="mt-6 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("adm_rep_preview_title")}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("acc_card_payments_in")}</span>
                  <span className="font-medium">{formatFcfa(periodSummary.totalPaymentsIn)}</span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("acc_card_manager_expenses")}</span>
                  <span className="font-medium">{formatFcfa(periodSummary.totalManagerExpenses)}</span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("acc_card_extraordinary")}</span>
                  <span className="font-medium">{formatFcfa(periodSummary.totalExtraordinaryExpenses)}</span>
                </li>
                <li className="flex justify-between gap-4 border-t border-border/50 pt-2 tabular-nums">
                  <span className="font-medium">{t("acc_card_net")}</span>
                  <span className="font-semibold">{formatFcfa(periodSummary.theoreticalNetBalance)}</span>
                </li>
              </ul>
            </section>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!chargesReport || busy !== null}
                onClick={exportChargesCsv}
              >
                {busy === "charges-csv" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {t("acc_export_csv")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!chargesReport || busy !== null}
                onClick={() => void exportChargesPdf()}
              >
                {busy === "charges-pdf" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 size-4" />
                )}
                {t("acc_export_pdf")}
              </Button>
            </div>

            {chargesReport ? (
              <div className="mt-4 overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("adm_rep_col_type")}</TableHead>
                      <TableHead>{t("adm_rep_col_date")}</TableHead>
                      <TableHead>{t("adm_rep_col_label")}</TableHead>
                      <TableHead>{t("adm_rep_col_manager")}</TableHead>
                      <TableHead className="text-right">{t("adm_rep_col_amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chargesReport.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          {t("adm_rep_charges_empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      chargesReport.rows.slice(0, 50).map((row) => (
                        <TableRow key={`${row.kind}-${row.id}`}>
                          <TableCell>
                            {row.kind === "manager"
                              ? t("adm_rep_type_manager")
                              : t("adm_rep_type_extraordinary")}
                          </TableCell>
                          <TableCell>{row.spentAt}</TableCell>
                          <TableCell>{row.label}</TableCell>
                          <TableCell>{row.managerName ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(row.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {chargesReport && chargesReport.rows.length > 50 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("adm_rep_preview_truncated").replace("{n}", "50")}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <p className="mt-6 text-sm text-muted-foreground">{t("adm_rep_footer_note")}</p>
    </div>
  )
}
