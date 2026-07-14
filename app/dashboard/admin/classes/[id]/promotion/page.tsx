"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Filter,
  GraduationCap,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react"
import { DetailPageSkeleton } from "@/components/loading/data-skeletons"
import { classesService, type StaffClass } from "@/domains/classes"
import { learnersService } from "@/domains/learners"
import { isLearnerFullyPaid, resolveLearnerRemaining } from "@/domains/learners/learner-balance"
import { ActionFeedbackOverlay } from "@/components/admin/action-feedback-overlay"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useAdminLearnersQuery } from "@/hooks/use-admin-learners"
import { useActionFeedback } from "@/hooks/use-action-feedback"
import { formatFcfa, getClassById } from "@/services/admin-mock.service"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MobileBackButton } from "@/components/mobile-back-button"
import { cn } from "@/lib/utils"
import { useLocale } from "@/hooks/use-locale"
import { isApiDataProvider } from "@/lib/data-provider"
import { isSchoolPeriodFinished } from "@/lib/school-period"

export default function ClassPromotionPage() {
  const { t, locale } = useLocale()
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const { classes: adminClassesList, loading: classesLoading } = useAdminClassesQuery()
  const { learners: adminLearnersList, loading: learnersLoading } = useAdminLearnersQuery()
  const [source, setSource] = useState<StaffClass | null>(null)
  const [loadingSource, setLoadingSource] = useState(true)

  useEffect(() => {
    if (!classId) {
      setSource(null)
      setLoadingSource(false)
      return
    }

    const fromList = adminClassesList.find((c) => c.id === classId)
    if (fromList) {
      setSource(fromList)
      setLoadingSource(false)
      return
    }

    if (!isApiDataProvider()) {
      setSource(getClassById(classId) ?? null)
      setLoadingSource(false)
      return
    }

    if (classesLoading) {
      setSource(null)
      setLoadingSource(true)
      return
    }

    let cancelled = false
    setLoadingSource(true)
    void classesService
      .get(classId)
      .then((item) => {
        if (!cancelled) {
          setSource(item)
          setLoadingSource(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSource(null)
          setLoadingSource(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [classId, adminClassesList, classesLoading])

  const candidates = useMemo(
    () => adminLearnersList.filter((item) => item.classId === classId),
    [adminLearnersList, classId],
  )

  const [destinationId, setDestinationId] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  useEffect(() => {
    const firstOther = adminClassesList.find((c) => c.id !== classId)?.id ?? ""
    setDestinationId((prev) => prev || firstOther)
  }, [adminClassesList, classId])
  useEffect(() => {
    setSelectedIds(candidates.map((c) => c.id))
  }, [candidates])

  const [blockUnpaid, setBlockUnpaid] = useState(true)
  const [excludeReasons, setExcludeReasons] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { feedback, close, run } = useActionFeedback()

  if (loadingSource || (isApiDataProvider() && (classesLoading || learnersLoading))) {
    return <DetailPageSkeleton />
  }

  if (!source) {
    return (
      <div className="px-4 py-10 md:px-6">
        <MobileBackButton fallbackHref="/dashboard/admin/classes" />
        <p className="mt-4 text-muted-foreground">{t("adm_class_fiche_notfound")}</p>
      </div>
    )
  }

  const destination = adminClassesList.find((c) => c.id === destinationId)
  const otherClasses = adminClassesList.filter((c) => c.id !== source.id)

  const filteredCandidates = candidates.filter((row) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query || row.fullName.toLowerCase().includes(query) || row.phone.toLowerCase().includes(query)
    const isPaid = isLearnerFullyPaid(row, adminClassesList)
    const matchesPayment = paymentFilter === "all" || (paymentFilter === "paid" ? isPaid : !isPaid)
    return matchesSearch && matchesPayment
  })

  const sourcePeriodFinished = isSchoolPeriodFinished(source)
  const sourcePeriodEndLabel = source.periodEnd
    ? new Date(source.periodEnd).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")
    : "—"

  const unpaidIds = candidates
    .filter((learner) => !isLearnerFullyPaid(learner, adminClassesList))
    .map((learner) => learner.id)
  const blockedIds = blockUnpaid ? unpaidIds : []
  const promotableCount = selectedIds.filter((id) => !blockedIds.includes(id)).length
  const promotableIds = selectedIds.filter((id) => !blockedIds.includes(id))

  async function handlePromote() {
    if (promotableCount === 0 || !destination || !destinationId) return

    setSubmitting(true)
    const outcome = await run(
      () =>
        learnersService.batchAssignClass({
          userIds: promotableIds,
          classId: destinationId,
        }),
      {
        loading: t("adm_class_promo_saving"),
        success: t("adm_class_promo_ok")
          .replace("{n}", String(promotableCount))
          .replace("{dest}", destination.name),
        error: t("adm_class_promo_fail"),
      },
    )
    setSubmitting(false)

    if (outcome.ok) {
      setSubmitted(true)
      setSelectedIds((prev) => prev.filter((id) => !promotableIds.includes(id)))
      window.dispatchEvent(new Event("admin-payments-updated"))
    }
  }

  return (
    <div className="min-h-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
      <MobileBackButton fallbackHref={`/dashboard/admin/classes/${source.id}`} />
      <AdminPageHeader
        title={t("adm_class_promo_title")}
        subtitle={t("adm_class_promo_sub").replace("{source}", source.name)}
        gradientClassName="from-indigo-700 via-violet-700 to-fuchsia-700"
        actions={
          <Link
            href={`/dashboard/admin/classes/${source.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-white/20"
          >
            <ArrowLeft className="size-3.5" />
            {t("adm_class_promo_back_fiche")}
          </Link>
        }
      />

      {!sourcePeriodFinished ? (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-semibold">{t("adm_class_promo_period_blocked_title")}</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
            {t("adm_class_promo_period_blocked_body").replace("{date}", sourcePeriodEndLabel)}
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xl">
            <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 px-5 py-4 text-white">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("adm_class_promo_step1")}</p>
                <p className="text-xs text-white/75">{t("adm_class_promo_step1_hint")}</p>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("adm_class_promo_source")}
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">{source.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("adm_class_promo_learners_attached").replace("{n}", String(candidates.length))}
                </p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("adm_class_promo_dest")}
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="mt-2 flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                >
                  {otherClasses.length === 0 ? (
                    <option value="">{t("adm_class_promo_no_other")}</option>
                  ) : (
                    otherClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xl">
            <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("adm_class_promo_step2")}</p>
                  <p className="text-xs text-muted-foreground">{t("adm_class_promo_step2_hint")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" className="rounded-xl" onClick={() => setSelectedIds(candidates.map((c) => c.id))}>
                  {t("adm_class_promo_select_all")}
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setSelectedIds([])}>
                  {t("adm_class_promo_clear_all")}
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 rounded-xl pl-9"
                    placeholder={t("adm_class_promo_search_ph")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as "all" | "paid" | "unpaid")}
                    className="flex h-11 w-full appearance-none rounded-xl border border-input bg-background py-2 pr-8 pl-9 text-sm"
                  >
                    <option value="all">{t("adm_class_promo_filter_all")}</option>
                    <option value="paid">{t("adm_class_promo_filter_paid")}</option>
                    <option value="unpaid">{t("adm_class_promo_filter_unpaid")}</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={blockUnpaid}
                  onChange={(e) => setBlockUnpaid(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-foreground">{t("adm_class_promo_block_unpaid")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t("adm_class_promo_block_unpaid_hint")}</span>
                </span>
              </label>

              <div className="space-y-3">
                {filteredCandidates.map((row) => {
                  const checked = selectedIds.includes(row.id)
                  const remaining = resolveLearnerRemaining(row, adminClassesList)
                  const hasDebt = remaining > 0.01
                  const isBlocked = blockUnpaid && hasDebt
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "rounded-2xl border p-4 transition-colors",
                        checked ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/30",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds((prev) => (checked ? prev.filter((id) => id !== row.id) : [...prev, row.id]))
                        }
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{row.fullName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.phone}
                            {hasDebt ? (
                              <span className="ml-2 text-amber-800 dark:text-amber-200">
                                · {t("adm_class_promo_arrears").replace("{amount}", formatFcfa(remaining))}
                              </span>
                            ) : (
                              <span className="ml-2 text-emerald-700">· {t("adm_class_promo_up_to_date")}</span>
                            )}
                          </p>
                        </div>
                        {checked ? (
                          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="size-5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      {!checked ? (
                        <Input
                          value={excludeReasons[row.id] ?? ""}
                          onChange={(e) => setExcludeReasons((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder={t("adm_class_promo_exclude_ph")}
                          className="mt-3 h-9 rounded-lg text-xs"
                        />
                      ) : null}
                      {isBlocked && checked ? (
                        <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                          {t("adm_class_promo_blocked_rule")}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
                {filteredCandidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                    {t("adm_class_promo_empty_filter")}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-card p-6 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <GraduationCap className="size-5" />
              <p className="text-sm font-semibold">{t("adm_class_promo_step3")}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("adm_class_promo_summary")
                .replace("{n}", String(promotableCount))
                .replace("{source}", source.name)
                .replace("{dest}", destination?.name ?? "—")}
            </p>
            {blockUnpaid && blockedIds.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                {t("adm_class_promo_auto_excl").replace("{n}", String(blockedIds.length))}
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-5 rounded-xl px-8"
              disabled={promotableCount === 0 || !destination || submitting || !sourcePeriodFinished}
              onClick={() => void handlePromote()}
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {submitting ? t("adm_class_promo_saving") : t("adm_class_promo_validate")}
            </Button>
            {promotableCount === 0 ? (
              <p className="mt-3 text-xs text-destructive">{t("adm_class_promo_err_none")}</p>
            ) : null}
            {!destination ? <p className="mt-2 text-xs text-destructive">{t("adm_class_promo_err_dest")}</p> : null}
            {!sourcePeriodFinished ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{t("adm_class_promo_period_blocked_short")}</p>
            ) : null}
            {submitted ? (
              <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                {t("adm_class_promo_done")
                  .replace("{n}", String(promotableCount))
                  .replace("{dest}", destination?.name ?? "")}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-4 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-background p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("adm_class_promo_resume")}</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">{t("adm_class_promo_cand")}</span>
                <span className="font-semibold">{candidates.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">{t("adm_class_promo_selected")}</span>
                <span className="font-semibold">{selectedIds.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">{t("adm_class_promo_promotable")}</span>
                <span className="font-semibold text-emerald-700">{promotableCount}</span>
              </li>
            </ul>
            <Link
              href="/dashboard/admin/apprenants"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-xs font-medium hover:bg-muted/50"
            >
              {t("adm_class_promo_link_learners")}
            </Link>
          </div>
        </aside>
      </div>

      <ActionFeedbackOverlay
        open={feedback.open}
        status={feedback.status}
        message={feedback.message}
        closeLabel={t("action_feedback_ok")}
        onClose={close}
      />
    </div>
  )
}
