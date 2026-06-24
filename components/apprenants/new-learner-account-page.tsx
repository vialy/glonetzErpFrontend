"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminUserPhoneField } from "@/components/admin/admin-user-phone-field"
import { ActionFeedbackOverlay } from "@/components/admin/action-feedback-overlay"
import { learnersService } from "@/domains/learners"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useActionFeedback } from "@/hooks/use-action-feedback"
import { useLocale } from "@/hooks/use-locale"
import {
  canonicalAdminUserPhone,
  getAdminUserPhoneFieldError,
  isAdminUserPhoneValid,
  parseAdminUserPhone,
} from "@/lib/admin-user-phone"
import { isApiDataProvider } from "@/lib/data-provider"
import { getAdminLearners } from "@/services/admin-mock.service"

export type NewLearnerAccountPageProps = {
  backHref: string
  afterSubmitHref: string
  importHref: string
}

export function NewLearnerAccountPage({ backHref, afterSubmitHref, importHref }: NewLearnerAccountPageProps) {
  const { t } = useLocale()
  const router = useRouter()
  const { classes: adminClasses, loading: classesLoading } = useAdminClassesQuery()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [classId, setClassId] = useState("")
  const [forcePinChange, setForcePinChange] = useState(true)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Synchronous guard against double submission: state updates are async, so a
  // rapid second click (or duplicate invocation) could fire a second POST
  // before `submitting` re-renders. The ref blocks it immediately.
  const submitLockRef = useRef(false)
  const { feedback, close, run } = useActionFeedback()

  useEffect(() => {
    setClassId((prev) => prev || adminClasses[0]?.id || "")
  }, [adminClasses])

  const phoneDuplicate = useMemo(() => {
    if (isApiDataProvider() || !isAdminUserPhoneValid(phone)) return false
    const key = canonicalAdminUserPhone(phone)
    return getAdminLearners().some((l) => canonicalAdminUserPhone(l.phone) === key)
  }, [phone])

  const phoneFieldError = getAdminUserPhoneFieldError(
    phone,
    phoneTouched || hasTriedSubmit,
    {
      empty: t("lrn_new_err_phone"),
      invalid: t("adm_usr_err_phone_invalid"),
      duplicate: t("lrn_new_err_phone_dup"),
    },
    phoneDuplicate,
  )

  const errors = useMemo(() => {
    const list: string[] = []
    if (!fullName.trim()) list.push(t("lrn_new_err_name"))
    if (fullName.trim() && fullName.trim().length < 3) list.push(t("lrn_new_err_name_short"))
    if (!isApiDataProvider()) {
      if (!dob) list.push(t("lrn_new_err_dob"))
      if (dob) {
        const dobDate = new Date(dob)
        const now = new Date()
        if (dobDate > now) list.push(t("lrn_new_err_dob_future"))
      }
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) list.push(t("lrn_new_err_email"))
    if (!classId) list.push(t("lrn_new_err_class"))
    return list
  }, [fullName, phone, dob, email, classId, t])

  async function handleSubmit() {
    if (submitLockRef.current) return
    setHasTriedSubmit(true)
    setPhoneTouched(true)
    setSubmitError(null)

    const phoneErr = getAdminUserPhoneFieldError(
      phone,
      true,
      {
        empty: t("lrn_new_err_phone"),
        invalid: t("adm_usr_err_phone_invalid"),
        duplicate: t("lrn_new_err_phone_dup"),
      },
      phoneDuplicate,
    )
    const parsedPhone = parseAdminUserPhone(phone)
    if (errors.length > 0 || phoneErr || !parsedPhone.ok) return

    submitLockRef.current = true
    setSubmitting(true)
    const outcome = await run(
      () =>
        learnersService.create({
          name: fullName.trim(),
          phone: parsedPhone.e164,
          email: email.trim() || undefined,
          classId,
        }),
      {
        loading: t("lrn_new_submitting"),
        success: (created) =>
          t("lrn_new_success_snip").replace("{name}", created.fullName || fullName.trim()),
        error: t("lrn_new_fail"),
      },
    )
    setSubmitting(false)
    if (outcome.ok) {
      window.setTimeout(() => {
        close()
        router.push(afterSubmitHref)
      }, 900)
    } else {
      submitLockRef.current = false
      if (outcome.error instanceof Error) {
        setSubmitError(outcome.error.message)
      }
    }
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("lrn_new_title")}
        subtitle={t("lrn_new_subtitle")}
        gradientClassName="from-indigo-600 via-violet-600 to-fuchsia-600"
        actions={
          <Link href={backHref} className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs">
            <ArrowLeft className="size-3.5" /> {t("lrn_new_back")}
          </Link>
        }
      />

      <div className="mt-4 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            {t("lrn_new_full_name")}
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              placeholder={t("lrn_new_ph_name")}
            />
          </label>
          <div className="md:col-span-2">
            <AdminUserPhoneField
              id="new-learner-phone"
              value={phone}
              onChange={setPhone}
              label={t("lrn_new_phone")}
              hint={t("adm_usr_phone_hint")}
              placeholder={t("phone_placeholder")}
              searchPlaceholder={t("phone_country_search")}
              touched={phoneTouched || hasTriedSubmit}
              errorMessage={phoneFieldError}
              onBlur={() => setPhoneTouched(true)}
            />
          </div>
          {!isApiDataProvider() ? (
            <label className="text-sm">
              {t("lrn_new_dob")}
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
          ) : null}
          <label className="text-sm">
            {t("lrn_new_email_optional")}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              placeholder={t("lrn_new_ph_email")}
            />
          </label>
          {!isApiDataProvider() ? (
            <label className="text-sm md:col-span-2">
              {t("lrn_new_addr_optional")}
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                placeholder={t("lrn_new_ph_addr")}
              />
            </label>
          ) : null}
          <label className="text-sm md:col-span-2">
            {t("lrn_new_class")}
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={classesLoading || adminClasses.length === 0}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 disabled:opacity-60"
            >
              {adminClasses.length === 0 ? (
                <option value="">{t("lrn_new_no_class")}</option>
              ) : (
                adminClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          {isApiDataProvider() ? t("lrn_new_credentials_api_hint") : t("lrn_new_pin_info")}
        </div>
        {!isApiDataProvider() ? (
          <label className="mt-3 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forcePinChange} onChange={(e) => setForcePinChange(e.target.checked)} />
            {t("lrn_new_force_pin")}
          </label>
        ) : null}

        {hasTriedSubmit && errors.length > 0 ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errors.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || classesLoading || adminClasses.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {submitting ? t("lrn_new_submitting") : t("lrn_new_submit")}
          </button>
          <Link href={importHref} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
            {t("lrn_new_go_import")}
          </Link>
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
