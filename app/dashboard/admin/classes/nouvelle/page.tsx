"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, CalendarRange, Save, School, Sparkles } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ActionFeedbackOverlay } from "@/components/admin/action-feedback-overlay"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MobileBackButton } from "@/components/mobile-back-button"
import { classesService } from "@/domains/classes"
import { useActionFeedback } from "@/hooks/use-action-feedback"
import { useLocale } from "@/hooks/use-locale"
import {
  CLASS_LEVELS,
  CLASS_TIME_SLOTS,
  classTimeSlotLabel,
  type ClassLevel,
  type ClassTimeSlot,
} from "@/lib/class-metadata"
import { deriveClassSession } from "@/lib/class-session"

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export default function NouvelleClassePage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const router = useRouter()
  const [name, setName] = useState("")
  const [level, setLevel] = useState<ClassLevel | "">("")
  const [timeSlot, setTimeSlot] = useState<ClassTimeSlot | "">("")
  const [description, setDescription] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [tuition, setTuition] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const { feedback, close, run } = useActionFeedback()

  const derivedSession = useMemo(
    () => deriveClassSession(periodStart, periodEnd, locale === "en" ? "en" : "fr"),
    [periodStart, periodEnd, locale],
  )

  const errors = useMemo(() => {
    const list: string[] = []
    if (!name.trim()) list.push(t("adm_class_new_err_name"))
    if (!level) list.push(t("adm_class_new_err_level"))
    if (!timeSlot) list.push(t("adm_class_new_err_time_slot"))
    if (!periodStart) list.push(t("adm_class_new_err_start"))
    if (!periodEnd) list.push(t("adm_class_new_err_end"))
    if (periodStart && periodEnd && periodStart > periodEnd) list.push(t("adm_class_new_err_order"))
    const amount = Number(tuition)
    if (!tuition.trim() || Number.isNaN(amount) || amount <= 0) list.push(t("adm_class_new_err_tuition"))
    if (description.length > 1000) list.push(t("adm_class_new_err_description_len"))
    return list
  }, [name, level, timeSlot, description, periodStart, periodEnd, tuition, t])

  async function submit() {
    setShowErrors(true)
    if (errors.length > 0) return
    setSubmitting(true)
    const amount = Number(tuition)
    const outcome = await run(
      () =>
        classesService.create({
          name: name.trim(),
          description: description.trim(),
          level: level as ClassLevel,
          timeSlot: timeSlot as ClassTimeSlot,
          periodStart,
          periodEnd,
          tuitionAmount: amount,
          status: "active",
          locale: locale === "en" ? "en" : "fr",
        }),
      {
        loading: t("adm_class_new_creating"),
        success: (created) => t("adm_class_new_ok").replace("{name}", created.name),
        error: t("adm_class_new_fail"),
      },
    )
    setSubmitting(false)
    if (outcome.ok) {
      window.setTimeout(() => {
        close()
        router.push(`/dashboard/admin/classes/${outcome.result.id}`)
      }, 900)
    }
  }

  return (
    <div className="min-h-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/admin/classes" />
      <AdminPageHeader
        title={t("adm_class_new_title")}
        subtitle={t("adm_class_new_subtitle")}
        gradientClassName="from-indigo-600 via-violet-600 to-fuchsia-600"
        actions={
          <Link
            href="/dashboard/admin/classes"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-primary-foreground backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="size-3.5" />
            {t("adm_class_new_back_list")}
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xl">
          <div className="border-b border-border/60 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <School className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">{t("adm_class_new_section_info")}</p>
                <p className="text-xs text-white/75">{t("adm_class_new_section_hint")}</p>
              </div>
            </div>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="nc-name">{t("adm_class_new_name")}</Label>
              <Input
                id="nc-name"
                className="h-11 rounded-xl"
                placeholder="Ex: A3 - Jan 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nc-level">{t("adm_class_new_level")}</Label>
                <select
                  id="nc-level"
                  className={selectClassName}
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ClassLevel)}
                  required
                >
                  <option value="">{t("adm_class_new_level_placeholder")}</option>
                  {CLASS_LEVELS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nc-slot">{t("adm_class_new_time_slot")}</Label>
                <select
                  id="nc-slot"
                  className={selectClassName}
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as ClassTimeSlot)}
                  required
                >
                  <option value="">{t("adm_class_new_time_slot_placeholder")}</option>
                  {CLASS_TIME_SLOTS.map((item) => (
                    <option key={item} value={item}>
                      {item} — {classTimeSlotLabel(item, locale === "en" ? "en" : "fr")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-description">{t("adm_class_new_description")}</Label>
              <Textarea
                id="nc-description"
                className="min-h-[100px] resize-y rounded-xl"
                placeholder={t("adm_class_new_description_ph")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {t("adm_class_new_description_hint")} ({description.length}/1000)
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarRange className="size-3.5 text-indigo-600" />
                {t("adm_class_new_period")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nc-start">{t("adm_class_new_start")}</Label>
                  <Input
                    id="nc-start"
                    type="date"
                    className="h-11 rounded-xl"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nc-end">{t("adm_class_new_end")}</Label>
                  <Input
                    id="nc-end"
                    type="date"
                    className="h-11 rounded-xl"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>
              {derivedSession ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("adm_class_new_session_auto")}{" "}
                  <span className="font-semibold text-foreground">{derivedSession}</span>
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">{t("adm_class_new_session_auto_empty")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-tuition">{t("adm_class_new_tuition")}</Label>
              <Input
                id="nc-tuition"
                type="number"
                min={1}
                className="h-11 rounded-xl sm:max-w-md"
                placeholder="162000"
                value={tuition}
                onChange={(e) => setTuition(e.target.value)}
              />
              {tuition && !Number.isNaN(Number(tuition)) ? (
                <p className="text-xs text-muted-foreground">
                  {t("adm_class_new_preview")} {formatMoney(Number(tuition))}
                </p>
              ) : null}
            </div>

            {showErrors && errors.length > 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {errors.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                className="rounded-xl px-6"
                onClick={submit}
                disabled={submitting}
              >
                <Save className="mr-2 size-4" />
                {submitting ? t("adm_class_new_creating") : t("adm_class_new_submit")}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" asChild>
                <Link href="/dashboard/admin/classes">{t("adm_class_new_cancel")}</Link>
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-background p-5 shadow-lg">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <p className="text-sm font-semibold">{t("adm_class_new_tips")}</p>
            </div>
            <ul className="mt-3 list-inside list-disc space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>{t("adm_class_new_tip_1")}</li>
              <li>{t("adm_class_new_tip_2")}</li>
              <li>{t("adm_class_new_tip_3")}</li>
            </ul>
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
