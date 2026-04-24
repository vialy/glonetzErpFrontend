"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { getAdminLearners } from "@/services/admin-mock.service"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { useLocale } from "@/hooks/use-locale"

export type NewLearnerAccountPageProps = {
  /** Lien Retour (header) */
  backHref: string
  /** Redirection apres creation reussie */
  afterSubmitHref: string
  /** Lien secondaire vers l'import */
  importHref: string
}

export function NewLearnerAccountPage({ backHref, afterSubmitHref, importHref }: NewLearnerAccountPageProps) {
  const { t } = useLocale()
  const router = useRouter()
  const adminClasses = useAdminClasses()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [classId, setClassId] = useState("")
  const [forcePinChange, setForcePinChange] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setClassId((prev) => prev || adminClasses[0]?.id || "")
  }, [adminClasses])
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [snipMessage, setSnipMessage] = useState("")
  const [snipType, setSnipType] = useState<"success" | "error">("success")
  const [snipCounter, setSnipCounter] = useState(0)

  function normalizePhone(phoneValue: string): string {
    return phoneValue.replace(/[^\d]/g, "")
  }

  const errors = useMemo(() => {
    const list: string[] = []
    if (!fullName.trim()) list.push(t("lrn_new_err_name"))
    if (fullName.trim() && fullName.trim().length < 3) list.push(t("lrn_new_err_name_short"))
    if (!phone.trim()) list.push(t("lrn_new_err_phone"))
    if (phone.trim()) {
      const normalized = normalizePhone(phone)
      if (normalized.length < 8 || normalized.length > 15) {
        list.push(t("lrn_new_err_phone_len"))
      }
      const exists = getAdminLearners().some((l) => normalizePhone(l.phone) === normalized)
      if (exists) list.push(t("lrn_new_err_phone_dup"))
    }
    if (!dob) list.push(t("lrn_new_err_dob"))
    if (dob) {
      const dobDate = new Date(dob)
      const now = new Date()
      if (dobDate > now) list.push(t("lrn_new_err_dob_future"))
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) list.push(t("lrn_new_err_email"))
    if (!classId) list.push(t("lrn_new_err_class"))
    return list
  }, [fullName, phone, dob, email, classId, t])

  useEffect(() => {
    if (snipCounter <= 0) return
    const timer = setTimeout(() => setSnipCounter((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [snipCounter])

  useEffect(() => {
    if (snipCounter === 0) setSnipMessage("")
  }, [snipCounter])

  function showSnip(message: string, type: "success" | "error") {
    setSnipMessage(message)
    setSnipType(type)
    setSnipCounter(5)
  }

  function handleSubmit() {
    setHasTriedSubmit(true)
    if (errors.length > 0) {
      showSnip(errors[0], "error")
      return
    }
    setSaved(true)
    showSnip(t("lrn_new_success_snip").replace("{name}", fullName), "success")
    setTimeout(() => {
      router.push(afterSubmitHref)
    }, 700)
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
          <label className="text-sm">
            {t("lrn_new_phone")}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              placeholder={t("lrn_new_ph_phone")}
            />
          </label>
          <label className="text-sm">
            {t("lrn_new_dob")}
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
          </label>
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
          <label className="text-sm md:col-span-2">
            {t("lrn_new_addr_optional")}
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              placeholder={t("lrn_new_ph_addr")}
            />
          </label>
          <label className="text-sm md:col-span-2">
            {t("lrn_new_class")}
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
              {adminClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{t("lrn_new_pin_info")}</div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={forcePinChange} onChange={(e) => setForcePinChange(e.target.checked)} />
          {t("lrn_new_force_pin")}
        </label>

        {hasTriedSubmit && errors.length > 0 ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errors.map((item) => (
              <p key={item}>
                - {item}
              </p>
            ))}
          </div>
        ) : null}
        {saved ? (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
            {t("lrn_new_saved")
              .replace("{name}", fullName)
              .replace("{className}", adminClasses.find((c) => c.id === classId)?.name ?? "")
              .replace(
                "{pinPolicy}",
                forcePinChange ? t("lrn_new_pin_required") : t("lrn_new_pin_optional"),
              )}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleSubmit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Save className="size-4" /> {t("lrn_new_submit")}
          </button>
          <Link href={importHref} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
            {t("lrn_new_go_import")}
          </Link>
        </div>
        {snipMessage ? (
          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${
              snipType === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            <span>{snipMessage}</span>
            <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px]">{snipCounter}s</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
