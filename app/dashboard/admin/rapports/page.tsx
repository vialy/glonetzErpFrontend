"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Building2,
  Download,
  FileDown,
  GraduationCap,
  Loader2,
  UserRound,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ClassSearchSelect } from "@/components/admin/class-search-select"
import { ManagerPeriodFilter } from "@/components/manager/manager-period-filter"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { staffMembersService, type StaffMember } from "@/domains/staff"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useLocale } from "@/hooks/use-locale"
import {
  buildClassLearnerReport,
  buildClassReportCsv,
  buildCompanyAccountReport,
  buildCompanyAccountReportCsv,
  buildManagerAccountReport,
  buildManagerAccountReportCsv,
  companyMovementKindLabel,
  downloadClassReportPdf,
  downloadCompanyAccountReportPdf,
  downloadCsvFile,
  downloadManagerAccountReportPdf,
  managerMovementKindLabel,
  type ClassLearnerReport,
  type CompanyAccountReport,
  type ManagerAccountReport,
} from "@/lib/admin-reports"
import { formatFcfa } from "@/lib/audit-date-range"
import { managerFilterToAuditDateRange, type ManagerPeriodFilterValue } from "@/lib/manager-period-range"

const defaultPeriodFilter = (): ManagerPeriodFilterValue => ({
  preset: "last_30",
  customFrom: "",
  customTo: "",
})

type ExportKind =
  | "class-csv"
  | "class-pdf"
  | "company-csv"
  | "company-pdf"
  | "manager-csv"
  | "manager-pdf"

export default function AdminReportsPage() {
  const { t, locale } = useLocale()
  const { classes, loading: classesLoading } = useAdminClassesQuery()
  const [companyPeriodFilter, setCompanyPeriodFilter] =
    useState<ManagerPeriodFilterValue>(defaultPeriodFilter)
  const [managerPeriodFilter, setManagerPeriodFilter] =
    useState<ManagerPeriodFilterValue>(defaultPeriodFilter)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedManagerId, setSelectedManagerId] = useState("")
  const [managers, setManagers] = useState<StaffMember[]>([])
  const [managersLoading, setManagersLoading] = useState(true)
  const [classReport, setClassReport] = useState<ClassLearnerReport | null>(null)
  const [classReportLoading, setClassReportLoading] = useState(false)
  const [classReportError, setClassReportError] = useState<string | null>(null)
  const [companyReport, setCompanyReport] = useState<CompanyAccountReport | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [managerReport, setManagerReport] = useState<ManagerAccountReport | null>(null)
  const [managerLoading, setManagerLoading] = useState(false)
  const [managerReportError, setManagerReportError] = useState<string | null>(null)
  const [busy, setBusy] = useState<ExportKind | null>(null)

  const companyAuditRange = useMemo(
    () => managerFilterToAuditDateRange(companyPeriodFilter),
    [companyPeriodFilter],
  )
  const managerAuditRange = useMemo(
    () => managerFilterToAuditDateRange(managerPeriodFilter),
    [managerPeriodFilter],
  )
  const classOptions = useMemo(() => classes.map((c) => ({ id: c.id, name: c.name })), [classes])

  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`

  useEffect(() => {
    let cancelled = false
    setManagersLoading(true)
    staffMembersService
      .list()
      .then((list) => {
        if (cancelled) return
        const onlyManagers = list
          .filter((m) => m.role === "manager" && m.status === "active")
          .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }))
        setManagers(onlyManagers)
      })
      .catch(() => {
        if (!cancelled) setManagers([])
      })
      .finally(() => {
        if (!cancelled) setManagersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!companyAuditRange) {
      setCompanyReport(null)
      return
    }

    let cancelled = false
    setCompanyLoading(true)

    buildCompanyAccountReport(companyAuditRange)
      .then((report) => {
        if (!cancelled) setCompanyReport(report)
      })
      .catch(() => {
        if (!cancelled) setCompanyReport(null)
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyAuditRange])

  useEffect(() => {
    if (!managerAuditRange || !selectedManagerId) {
      setManagerReport(null)
      setManagerReportError(null)
      return
    }

    let cancelled = false
    setManagerLoading(true)
    setManagerReportError(null)

    buildManagerAccountReport(selectedManagerId, managerAuditRange)
      .then((report) => {
        if (cancelled) return
        if (!report) {
          setManagerReport(null)
          setManagerReportError(t("adm_rep_manager_not_found"))
          return
        }
        setManagerReport(report)
      })
      .catch(() => {
        if (!cancelled) {
          setManagerReport(null)
          setManagerReportError(t("data_error_desc"))
        }
      })
      .finally(() => {
        if (!cancelled) setManagerLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [managerAuditRange, selectedManagerId, t])

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

  const exportCompanyCsv = useCallback(() => {
    if (!companyReport || !companyAuditRange) return
    setBusy("company-csv")
    try {
      downloadCsvFile(
        `rapport-compte-principal-${companyAuditRange.from}-${companyAuditRange.to}.csv`,
        buildCompanyAccountReportCsv(companyReport),
      )
      toast({
        title: t("adm_rep_export_done"),
        description: `${companyAuditRange.from} → ${companyAuditRange.to}`,
      })
    } finally {
      setBusy(null)
    }
  }, [companyAuditRange, companyReport, t])

  const exportCompanyPdf = useCallback(async () => {
    if (!companyReport || !companyAuditRange) return
    setBusy("company-pdf")
    try {
      await downloadCompanyAccountReportPdf(companyReport)
      toast({
        title: t("adm_rep_export_done"),
        description: `${companyAuditRange.from} → ${companyAuditRange.to}`,
      })
    } finally {
      setBusy(null)
    }
  }, [companyAuditRange, companyReport, t])

  const exportManagerCsv = useCallback(() => {
    if (!managerReport || !managerAuditRange) return
    setBusy("manager-csv")
    try {
      downloadCsvFile(
        `rapport-manager-${managerReport.managerId}-${managerAuditRange.from}-${managerAuditRange.to}.csv`,
        buildManagerAccountReportCsv(managerReport),
      )
      toast({
        title: t("adm_rep_export_done"),
        description: managerReport.managerName,
      })
    } finally {
      setBusy(null)
    }
  }, [managerAuditRange, managerReport, t])

  const exportManagerPdf = useCallback(async () => {
    if (!managerReport || !managerAuditRange) return
    setBusy("manager-pdf")
    try {
      await downloadManagerAccountReportPdf(managerReport)
      toast({
        title: t("adm_rep_export_done"),
        description: managerReport.managerName,
      })
    } finally {
      setBusy(null)
    }
  }, [managerAuditRange, managerReport, t])

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_rep_page_title")}
        subtitle={t("adm_rep_page_sub")}
        gradientClassName="from-fuchsia-600 to-indigo-600"
      />

      {/* 1. Rapport par classe */}
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

      {/* 2. Rapport compte principal */}
      <section className="mt-8 rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-teal-500/10 p-2 text-teal-700 dark:text-teal-400">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{t("adm_rep_company_section_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("adm_rep_company_section_desc")}</p>
          </div>
        </div>

        <div className="mt-4">
          <ManagerPeriodFilter
            value={companyPeriodFilter}
            onChange={setCompanyPeriodFilter}
            hint={t("adm_rep_filter_hint")}
            summary={
              companyAuditRange ? (
                <span>
                  {companyAuditRange.from} → {companyAuditRange.to}
                </span>
              ) : null
            }
          />
        </div>

        {!companyAuditRange ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("adm_rep_need_period")}
          </p>
        ) : null}

        {companyLoading && companyAuditRange ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {companyReport && companyAuditRange && !companyLoading ? (
          <>
            <section className="mt-6 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("adm_rep_preview_title")}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_company_payments_in")}</span>
                  <span className="font-medium text-emerald-700">
                    {formatFcfa(companyReport.totals.paymentsIn)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_company_extra_in")}</span>
                  <span className="font-medium text-emerald-700">
                    {formatFcfa(companyReport.totals.extraordinaryIn)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_company_extra_out")}</span>
                  <span className="font-medium text-rose-700">
                    {formatFcfa(companyReport.totals.extraordinaryOut)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_company_allocations")}</span>
                  <span className="font-medium text-rose-700">
                    {formatFcfa(companyReport.totals.managerAllocations)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 border-t border-border/50 pt-2 tabular-nums">
                  <span className="font-medium">{t("adm_rep_period_balance")}</span>
                  <span className="font-semibold">{formatFcfa(companyReport.totals.periodBalance)}</span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_current_balance")}</span>
                  <span className="font-medium">{formatFcfa(companyReport.accountBalance)}</span>
                </li>
              </ul>
            </section>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={exportCompanyCsv}
              >
                {busy === "company-csv" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {t("acc_export_csv")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                onClick={() => void exportCompanyPdf()}
              >
                {busy === "company-pdf" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 size-4" />
                )}
                {t("acc_export_pdf")}
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adm_rep_col_direction")}</TableHead>
                    <TableHead>{t("adm_rep_col_type")}</TableHead>
                    <TableHead>{t("adm_rep_col_date")}</TableHead>
                    <TableHead>{t("adm_rep_col_label")}</TableHead>
                    <TableHead className="text-right">{t("adm_rep_col_amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyReport.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        {t("adm_rep_company_empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyReport.rows.slice(0, 50).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.direction === "in" ? t("adm_rep_dir_in") : t("adm_rep_dir_out")}
                        </TableCell>
                        <TableCell>{companyMovementKindLabel(row.kind)}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.label}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${
                            row.direction === "in" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {formatMoney(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {companyReport.rows.length > 50 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("adm_rep_preview_truncated").replace("{n}", "50")}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {/* 3. Rapport manager */}
      <section className="mt-8 rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700 dark:text-blue-400">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{t("adm_rep_manager_section_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("adm_rep_manager_section_desc")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("adm_rep_manager_pick_label")}</Label>
            {managersLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedManagerId || "none"}
                onValueChange={(value) => setSelectedManagerId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("adm_rep_manager_pick")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("adm_rep_manager_pick")}</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <ManagerPeriodFilter
              value={managerPeriodFilter}
              onChange={setManagerPeriodFilter}
              hint={t("adm_rep_filter_hint")}
              summary={
                managerAuditRange ? (
                  <span>
                    {managerAuditRange.from} → {managerAuditRange.to}
                  </span>
                ) : null
              }
            />
          </div>
        </div>

        {!selectedManagerId ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("adm_rep_manager_pick_hint")}</p>
        ) : null}

        {selectedManagerId && !managerAuditRange ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("adm_rep_need_period")}
          </p>
        ) : null}

        {managerLoading && selectedManagerId && managerAuditRange ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {managerReportError ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {managerReportError}
          </p>
        ) : null}

        {managerReport && managerAuditRange && !managerLoading ? (
          <>
            <section className="mt-6 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("adm_rep_preview_title")} — {managerReport.managerName}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_manager_budgets_in")}</span>
                  <span className="font-medium text-emerald-700">
                    {formatFcfa(managerReport.totals.budgetsIn)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_manager_expenses_out")}</span>
                  <span className="font-medium text-rose-700">
                    {formatFcfa(managerReport.totals.expensesOut)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 border-t border-border/50 pt-2 tabular-nums">
                  <span className="font-medium">{t("adm_rep_period_balance")}</span>
                  <span className="font-semibold">{formatFcfa(managerReport.totals.periodBalance)}</span>
                </li>
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{t("adm_rep_remaining_balance")}</span>
                  <span className="font-medium">{formatFcfa(managerReport.accountBalance)}</span>
                </li>
              </ul>
            </section>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={exportManagerCsv}
              >
                {busy === "manager-csv" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {t("acc_export_csv")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                onClick={() => void exportManagerPdf()}
              >
                {busy === "manager-pdf" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 size-4" />
                )}
                {t("acc_export_pdf")}
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adm_rep_col_direction")}</TableHead>
                    <TableHead>{t("adm_rep_col_type")}</TableHead>
                    <TableHead>{t("adm_rep_col_date")}</TableHead>
                    <TableHead>{t("adm_rep_col_label")}</TableHead>
                    <TableHead className="text-right">{t("adm_rep_col_amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerReport.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        {t("adm_rep_manager_empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    managerReport.rows.slice(0, 50).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.direction === "in" ? t("adm_rep_dir_in") : t("adm_rep_dir_out")}
                        </TableCell>
                        <TableCell>{managerMovementKindLabel(row.kind)}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.label}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${
                            row.direction === "in" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {formatMoney(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {managerReport.rows.length > 50 ? (
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
