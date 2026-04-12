"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { formatFcfa, getAdminClasses, getClassById, type AdminClassStatus } from "@/services/admin-mock.service"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

export default function EditClassPage() {
  const params = useParams<{ id: string }>()
  const classId = params?.id ?? ""
  const cls = getClassById(classId)
  const router = useRouter()

  const [name, setName] = useState(cls?.name ?? "")
  const [session, setSession] = useState(cls?.session ?? "")
  const [status, setStatus] = useState<AdminClassStatus>(cls?.status ?? "active")
  const [tuition, setTuition] = useState(String(cls?.tuitionAmount ?? ""))
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)

  const errors = useMemo(() => {
    const list: string[] = []
    if (!name.trim()) list.push("Le nom de classe est obligatoire.")
    if (!session.trim()) list.push("La session est obligatoire.")
    const amount = Number(tuition)
    if (!tuition || Number.isNaN(amount) || amount <= 0) list.push("La pension doit etre superieure a 0.")
    if (cls && name.trim() && session.trim()) {
      const key = `${name.trim().toLowerCase()}::${session.trim().toLowerCase()}`
      const exists = getAdminClasses().some((c) => c.id !== cls.id && `${c.name.toLowerCase()}::${c.session.toLowerCase()}` === key)
      if (exists) list.push("Une autre classe porte deja ce nom sur la meme session.")
    }
    return list
  }, [name, session, tuition, cls])

  if (!cls) return <div className="px-4 py-8 md:px-6 lg:px-8">Classe introuvable.</div>

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={`Editer ${cls.name}`}
        subtitle="Mise a jour des informations de classe (simulation front-end)."
        gradientClassName="from-indigo-600 to-violet-600"
        actions={
          <Link href={`/dashboard/admin/classes/${cls.id}`} className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs">
            <ArrowLeft className="size-3.5" /> Retour fiche
          </Link>
        }
      />

      <div className="mt-4 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            Nom de classe
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
          </label>
          <label className="text-sm">
            Session
            <input value={session} onChange={(e) => setSession(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
          </label>
          <label className="text-sm">
            Montant pension (FCFA)
            <input value={tuition} onChange={(e) => setTuition(e.target.value)} type="number" className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
            {tuition ? <span className="mt-1 block text-xs text-muted-foreground">Apercu: {formatFcfa(Number(tuition) || 0)}</span> : null}
          </label>
          <label className="text-sm">
            Statut
            <select value={status} onChange={(e) => setStatus(e.target.value as AdminClassStatus)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
              <option value="active">active</option>
              <option value="finished">finished</option>
              <option value="archived">archived</option>
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
            Classe mise a jour avec succes (simulation).
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTouched(true)
              if (errors.length === 0) setSaved(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Save className="size-4" /> Enregistrer
          </button>
          {saved ? (
            <button onClick={() => router.push(`/dashboard/admin/classes/${cls.id}`)} className="rounded-lg border px-4 py-2 text-sm">
              Retourner a la fiche
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
