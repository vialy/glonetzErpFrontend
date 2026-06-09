"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import {
  getAdminClasses,
  getClassById,
  updateAdminClass,
  type AdminClassStatus,
} from "@/services/admin-mock.service"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { useLocale } from "@/hooks/use-locale"

export default function EditClassPage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const cls = getClassById(classId)
  const router = useRouter()

  const [name, setName] = useState(cls?.name ?? "")
  const [description, setDescription] = useState(cls?.description ?? "")
  const [session, setSession] = useState(cls?.session ?? "")
  const [status, setStatus] = useState<AdminClassStatus>(cls?.status ?? "active")
  const [tuition, setTuition] = useState(String(cls?.tuitionAmount ?? ""))
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)

  const errors = useMemo(() => {
    const list: string[] = []
    if (!name.trim()) list.push(t("adm_class_edit_err_name"))
    if (!session.trim()) list.push(t("adm_class_edit_err_session"))
    const amount = Number(tuition)
    if (!tuition || Number.isNaN(amount) || amount <= 0) list.push(t("adm_class_edit_err_tuition"))
    if (description.length > 1000) list.push(t("adm_class_new_err_description_len"))
    if (cls && name.trim() && session.trim()) {
      const key = `${name.trim().toLowerCase()}::${session.trim().toLowerCase()}`
      const exists = getAdminClasses().some((c) => c.id !== cls.id && `${c.name.toLowerCase()}::${c.session.toLowerCase()}` === key)
      if (exists) list.push(t("adm_class_edit_err_dup"))
    }
    return list
  }, [name, description, session, tuition, cls, t])

  if (!cls) return <div className="px-4 py-8 md:px-6 lg:px-8">{t("adm_class_fiche_notfound")}</div>

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_class_edit_title").replace("{name}", cls.name)}
        subtitle={t("adm_class_edit_subtitle")}
        gradientClassName="from-indigo-600 to-violet-600"
        actions={
          <Link href={`/dashboard/admin/classes/${cls.id}`} className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs">
            <ArrowLeft className="size-3.5" /> {t("adm_class_edit_back_fiche")}
          </Link>
        }
      />

      <div className="mt-4 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            {t("adm_class_edit_name")}
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
          </label>
          <label className="text-sm md:col-span-2">
            {t("adm_class_edit_description")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder={t("adm_class_new_description_ph")}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {description.length}/1000
            </span>
          </label>
          <label className="text-sm">
            {t("adm_class_edit_session")}
            <input value={session} onChange={(e) => setSession(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
          </label>
          <label className="text-sm">
            {t("adm_class_edit_tuition")}
            <input value={tuition} onChange={(e) => setTuition(e.target.value)} type="number" className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
            {tuition ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {t("adm_class_edit_preview")} {formatMoney(Number(tuition) || 0)}
              </span>
            ) : null}
          </label>
          <label className="text-sm">
            {t("adm_class_edit_status")}
            <select value={status} onChange={(e) => setStatus(e.target.value as AdminClassStatus)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
              <option value="active">{t("adm_class_edit_st_active")}</option>
              <option value="finished">{t("adm_class_edit_st_finished")}</option>
              <option value="archived">{t("adm_class_edit_st_archived")}</option>
            </select>
          </label>
        </div>

        {touched && errors.length > 0 ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errors.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        ) : null}

        {saved ? (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
            {t("adm_class_edit_ok")}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTouched(true)
              if (errors.length > 0 || !cls) return
              updateAdminClass(cls.id, {
                name: name.trim(),
                description: description.trim(),
                session: session.trim(),
                status,
                tuitionAmount: Number(tuition),
              })
              setSaved(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Save className="size-4" /> {t("adm_class_edit_save")}
          </button>
          {saved ? (
            <button onClick={() => router.push(`/dashboard/admin/classes/${cls.id}`)} className="rounded-lg border px-4 py-2 text-sm">
              {t("adm_class_edit_back_detail")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
