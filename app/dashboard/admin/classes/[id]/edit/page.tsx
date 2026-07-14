"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CalendarRange, Loader2, Save } from "lucide-react"
import { FormSectionSkeleton } from "@/components/loading/data-skeletons"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ActionFeedbackOverlay } from "@/components/admin/action-feedback-overlay"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { classesService, type StaffClass } from "@/domains/classes"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useActionFeedback } from "@/hooks/use-action-feedback"
import { useLocale } from "@/hooks/use-locale"
import { getApiErrorMessage } from "@/lib/api-error"
import { deriveClassSession } from "@/lib/class-session"
import {
  CLASS_LEVELS,
  CLASS_TIME_SLOTS,
  classTimeSlotLabel,
  type ClassLevel,
  type ClassTimeSlot,
} from "@/lib/class-metadata"
import { isApiDataProvider } from "@/lib/data-provider"
import { getClassById } from "@/services/admin-mock.service"

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function applyClassToForm(
  item: StaffClass,
  setters: {
    setName: (v: string) => void
    setDescription: (v: string) => void
    setLevel: (v: ClassLevel) => void
    setTimeSlot: (v: ClassTimeSlot) => void
    setPeriodStart: (v: string) => void
    setPeriodEnd: (v: string) => void
    setTuition: (v: string) => void
  },
) {
  setters.setName(item.name)
  setters.setDescription(item.description)
  setters.setLevel(item.level)
  setters.setTimeSlot(item.timeSlot)
  setters.setPeriodStart(item.periodStart)
  setters.setPeriodEnd(item.periodEnd)
  setters.setTuition(String(item.tuitionAmount))
}

export default function EditClassPage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const router = useRouter()
  const { classes, loading: classesLoading } = useAdminClassesQuery()

  const [cls, setCls] = useState<StaffClass | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [level, setLevel] = useState<ClassLevel>("A1")
  const [timeSlot, setTimeSlot] = useState<ClassTimeSlot>("MO")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [tuition, setTuition] = useState("")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { feedback, close, run } = useActionFeedback()

  const derivedSession = useMemo(
    () => deriveClassSession(periodStart, periodEnd, locale === "en" ? "en" : "fr"),
    [periodStart, periodEnd, locale],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)

      const fromList = classes.find((item) => item.id === classId)
      if (fromList) {
        if (!cancelled) {
          setCls(fromList)
          applyClassToForm(fromList, {
            setName,
            setDescription,
            setLevel,
            setTimeSlot,
            setPeriodStart,
            setPeriodEnd,
            setTuition,
          })
          setLoading(false)
        }
        return
      }

      if (isApiDataProvider()) {
        if (classesLoading) return
        try {
          const item = await classesService.get(classId)
          if (cancelled) return
          if (!item) {
            setCls(null)
            setLoadError(t("adm_class_fiche_notfound"))
          } else {
            setCls(item)
            applyClassToForm(item, {
              setName,
              setDescription,
              setLevel,
              setTimeSlot,
              setPeriodStart,
              setPeriodEnd,
              setTuition,
            })
          }
        } catch (error) {
          if (!cancelled) {
            setCls(null)
            setLoadError(getApiErrorMessage(error, t("adm_set_load_err")))
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
        return
      }

      const mock = getClassById(classId) ?? null
      if (!cancelled) {
        if (mock) {
          setCls(mock)
          applyClassToForm(mock, {
            setName,
            setDescription,
            setLevel,
            setTimeSlot,
            setPeriodStart,
            setPeriodEnd,
            setTuition,
          })
        }
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [classId, classes, classesLoading, t])

  const isDirty = useMemo(() => {
    if (!cls) return false
    return (
      name.trim() !== cls.name.trim() ||
      description.trim() !== (cls.description ?? "").trim() ||
      level !== cls.level ||
      timeSlot !== cls.timeSlot ||
      periodStart !== cls.periodStart ||
      periodEnd !== cls.periodEnd ||
      Number(tuition) !== cls.tuitionAmount
    )
  }, [cls, name, description, level, timeSlot, periodStart, periodEnd, tuition])

  const errors = useMemo(() => {
    const list: string[] = []
    if (!name.trim()) list.push(t("adm_class_edit_err_name"))
    if (!level) list.push(t("adm_class_new_err_level"))
    if (!timeSlot) list.push(t("adm_class_new_err_time_slot"))
    if (!periodStart) list.push(t("adm_class_new_err_start"))
    if (!periodEnd) list.push(t("adm_class_new_err_end"))
    if (periodStart && periodEnd && periodStart > periodEnd) list.push(t("adm_class_new_err_order"))
    const amount = Number(tuition)
    if (!tuition || Number.isNaN(amount) || amount <= 0) list.push(t("adm_class_edit_err_tuition"))
    if (description.length > 1000) list.push(t("adm_class_new_err_description_len"))
    if (cls && name.trim() && derivedSession) {
      const key = `${name.trim().toLowerCase()}::${derivedSession.toLowerCase()}`
      const exists = classes.some(
        (item) =>
          item.id !== cls.id &&
          `${item.name.toLowerCase()}::${item.session.toLowerCase()}` === key,
      )
      if (exists) list.push(t("adm_class_edit_err_dup"))
    }
    return list
  }, [name, description, level, timeSlot, periodStart, periodEnd, tuition, cls, classes, derivedSession, t])

  async function handleSave() {
    setTouched(true)
    setSaveError(null)
    if (errors.length > 0 || !cls) return

    setSaving(true)
    const outcome = await run(
      async () => {
        const updated = await classesService.update(cls.id, {
          name: name.trim(),
          description: description.trim(),
          level,
          timeSlot,
          periodStart,
          periodEnd,
          tuitionAmount: Number(tuition),
          locale: locale === "en" ? "en" : "fr",
        })
        if (!updated) throw new Error(t("adm_class_new_fail"))
        return updated
      },
      {
        loading: t("adm_class_edit_saving"),
        success: t("adm_class_edit_ok"),
        error: t("adm_class_new_fail"),
      },
    )
    setSaving(false)
    if (outcome.ok) {
      window.setTimeout(() => {
        close()
        router.push("/dashboard/admin/classes")
      }, 900)
    } else if (outcome.error) {
      setSaveError(getApiErrorMessage(outcome.error, t("adm_class_new_fail")))
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <FormSectionSkeleton />
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <p className="text-muted-foreground">{loadError ?? t("adm_class_fiche_notfound")}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/admin/classes">{t("adm_class_fiche_back")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_class_edit_title").replace("{name}", cls.name)}
        subtitle={t("adm_class_edit_subtitle")}
        gradientClassName="from-indigo-600 to-violet-600"
        actions={
          <Link
            href={`/dashboard/admin/classes/${cls.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs"
          >
            <ArrowLeft className="size-3.5" /> {t("adm_class_edit_back_fiche")}
          </Link>
        }
      />

      <div className="mt-4 rounded-xl border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-name">{t("adm_class_edit_name")}</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-description">{t("adm_class_edit_description")}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={t("adm_class_new_description_ph")}
            />
            <p className="text-xs text-muted-foreground">{description.length}/1000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-level">{t("adm_class_new_level")}</Label>
            <select
              id="edit-level"
              className={selectClassName}
              value={level}
              onChange={(e) => setLevel(e.target.value as ClassLevel)}
            >
              {CLASS_LEVELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-slot">{t("adm_class_new_time_slot")}</Label>
            <select
              id="edit-slot"
              className={selectClassName}
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value as ClassTimeSlot)}
            >
              {CLASS_TIME_SLOTS.map((item) => (
                <option key={item} value={item}>
                  {item} — {classTimeSlotLabel(item, locale === "en" ? "en" : "fr")}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 md:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarRange className="size-3.5 text-indigo-600" />
              {t("adm_class_new_period")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-start">{t("adm_class_new_start")}</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">{t("adm_class_new_end")}</Label>
                <Input
                  id="edit-end"
                  type="date"
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
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tuition">{t("adm_class_edit_tuition")}</Label>
            <Input
              id="edit-tuition"
              type="number"
              min={1}
              value={tuition}
              onChange={(e) => setTuition(e.target.value)}
            />
            {tuition ? (
              <p className="text-xs text-muted-foreground">
                {t("adm_class_edit_preview")} {formatMoney(Number(tuition) || 0)}
              </p>
            ) : null}
          </div>
        </div>

        {touched && errors.length > 0 ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errors.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        ) : null}

        {saveError ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {saveError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !isDirty}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {saving ? t("adm_class_new_creating") : t("adm_class_edit_save")}
          </Button>
        </div>
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
