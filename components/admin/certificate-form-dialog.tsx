"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CERTIFICATE_LEVELS,
  COURSE_INFO_OPTIONS,
  EVALUATION_OPTIONS,
  certificatesService,
  type Certificate,
  type CertificateCreateMeta,
  type CertificateLevel,
  type CourseInfo,
  type CreateCertificateInput,
  type Evaluation,
} from "@/domains/certificates"

interface FormState {
  fullName: string
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: CertificateLevel
  courseStartDate: string
  courseEndDate: string
  lessonUnits: string
  lessonsAttended: string
  courseInfo: CourseInfo
  evaluation: Evaluation
  comments: string
}

/** Contexte de génération auto-remplie depuis un apprenant. */
export interface CertificatePrefill {
  fullName?: string
  dateOfBirth?: string
  placeOfBirth?: string
  courseStartDate?: string
  courseEndDate?: string
  learnerId?: string
  classId?: string
  className?: string
}

interface LinkContext {
  learnerId?: string
  classId?: string
  className?: string
}

const EMPTY_FORM: FormState = {
  fullName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  referenceLevel: "A1",
  courseStartDate: "",
  courseEndDate: "",
  lessonUnits: "",
  lessonsAttended: "",
  courseInfo: "Complete level",
  evaluation: "Participant",
  comments: "",
}

const ERROR_MESSAGES: Record<string, string> = {
  FULLNAME_REQUIRED: "Le nom complet est requis.",
  PLACE_REQUIRED: "Le lieu de naissance est requis.",
  BIRTHDATE_REQUIRED: "La date de naissance est requise.",
  START_REQUIRED: "La date de début est requise.",
  END_REQUIRED: "La date de fin est requise.",
  END_BEFORE_START: "La date de fin ne peut pas être antérieure à la date de début.",
  ATTENDED_GT_UNITS: "Les leçons suivies ne peuvent pas dépasser le nombre total de leçons.",
  DUPLICATE_CERTIFICATE: "Un certificat similaire existe déjà pour cet apprenant (même niveau, période qui se chevauche).",
  CERTIFICATE_LOCKED: "Ce certificat est approuvé et ne peut plus être modifié.",
}

function toForm(certificate: Certificate): FormState {
  return {
    fullName: certificate.fullName,
    dateOfBirth: certificate.dateOfBirth?.slice(0, 10) ?? "",
    placeOfBirth: certificate.placeOfBirth,
    referenceLevel: certificate.referenceLevel,
    courseStartDate: certificate.courseStartDate?.slice(0, 10) ?? "",
    courseEndDate: certificate.courseEndDate?.slice(0, 10) ?? "",
    lessonUnits: String(certificate.lessonUnits ?? ""),
    lessonsAttended: String(certificate.lessonsAttended ?? ""),
    courseInfo: certificate.courseInfo,
    evaluation: certificate.evaluation,
    comments: certificate.comments ?? "",
  }
}

type LinkedLockableField = "fullName" | "dateOfBirth" | "placeOfBirth" | "courseStartDate" | "courseEndDate"

function linkedLockedFields(
  certificate: Certificate | null | undefined,
  prefill: CertificatePrefill | null | undefined,
): Set<LinkedLockableField> {
  const locked = new Set<LinkedLockableField>()
  const fromLearner = Boolean(certificate?.learnerId ?? prefill?.learnerId)
  if (!fromLearner) return locked

  if (certificate) {
    locked.add("fullName")
    if (certificate.dateOfBirth) locked.add("dateOfBirth")
    if (certificate.placeOfBirth) locked.add("placeOfBirth")
    if (certificate.courseStartDate) locked.add("courseStartDate")
    if (certificate.courseEndDate) locked.add("courseEndDate")
    return locked
  }

  if (prefill?.fullName) locked.add("fullName")
  if (prefill?.dateOfBirth) locked.add("dateOfBirth")
  if (prefill?.placeOfBirth) locked.add("placeOfBirth")
  if (prefill?.courseStartDate) locked.add("courseStartDate")
  if (prefill?.courseEndDate) locked.add("courseEndDate")
  return locked
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR")
}

export function CertificateFormDialog({
  open,
  onOpenChange,
  certificate,
  prefill,
  createMeta,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificate?: Certificate | null
  prefill?: CertificatePrefill | null
  createMeta?: CertificateCreateMeta
  onSaved?: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [context, setContext] = useState<LinkContext>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (certificate) {
      setForm(toForm(certificate))
      setContext({
        learnerId: certificate.learnerId,
        classId: certificate.classId,
        className: certificate.className,
      })
    } else if (prefill) {
      setForm({
        ...EMPTY_FORM,
        fullName: prefill.fullName ?? "",
        dateOfBirth: prefill.dateOfBirth?.slice(0, 10) ?? "",
        placeOfBirth: prefill.placeOfBirth?.trim() ?? "",
        courseStartDate: prefill.courseStartDate?.slice(0, 10) ?? "",
        courseEndDate: prefill.courseEndDate?.slice(0, 10) ?? "",
      })
      setContext({ learnerId: prefill.learnerId, classId: prefill.classId, className: prefill.className })
    } else {
      setForm(EMPTY_FORM)
      setContext({})
    }
  }, [open, certificate, prefill])

  const dateError = useMemo(() => {
    if (form.courseStartDate && form.courseEndDate) {
      if (new Date(form.courseEndDate).getTime() < new Date(form.courseStartDate).getTime()) {
        return ERROR_MESSAGES.END_BEFORE_START
      }
    }
    const units = Number.parseInt(form.lessonUnits, 10)
    const attended = Number.parseInt(form.lessonsAttended, 10)
    if (Number.isFinite(units) && Number.isFinite(attended) && attended > units) {
      return ERROR_MESSAGES.ATTENDED_GT_UNITS
    }
    return ""
  }, [form.courseStartDate, form.courseEndDate, form.lessonUnits, form.lessonsAttended])

  const lockedFields = useMemo(
    () => linkedLockedFields(certificate, prefill),
    [certificate, prefill],
  )

  const isLinked = Boolean(certificate?.learnerId ?? prefill?.learnerId)

  function isLocked(field: LinkedLockableField) {
    return lockedFields.has(field)
  }

  const canSubmit =
    form.fullName.trim().length > 0 &&
    form.placeOfBirth.trim().length > 0 &&
    form.dateOfBirth &&
    form.courseStartDate &&
    form.courseEndDate &&
    form.lessonUnits !== "" &&
    form.lessonsAttended !== "" &&
    !dateError

  function inputClassName(locked: boolean, extra = "") {
    return `${fieldClass} ${locked ? "cursor-not-allowed bg-muted/50 text-muted-foreground" : ""} ${extra}`.trim()
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (isLocked(key as LinkedLockableField)) return
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const payload: CreateCertificateInput = {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        placeOfBirth: form.placeOfBirth,
        referenceLevel: form.referenceLevel,
        courseStartDate: form.courseStartDate,
        courseEndDate: form.courseEndDate,
        lessonUnits: Number.parseInt(form.lessonUnits, 10) || 0,
        lessonsAttended: Number.parseInt(form.lessonsAttended, 10) || 0,
        courseInfo: form.courseInfo,
        evaluation: form.evaluation,
        comments: form.comments,
        learnerId: context.learnerId,
        classId: context.classId,
        className: context.className,
      }

      if (certificate) {
        if (certificate.status === "disponible") throw new Error("CERTIFICATE_LOCKED")
        await certificatesService.update(certificate.id, payload)
        toast({ title: "Certificat modifié", description: `${payload.fullName} — ${certificate.referenceNumber}` })
      } else {
        const created = await certificatesService.create(payload, createMeta)
        const statusHint =
          created.status === "en_attente" ? " — soumis pour validation admin" : " — brouillon"
        toast({ title: "Certificat créé", description: `${created.fullName} — ${created.referenceNumber}${statusHint}` })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      toast({
        title: "Échec de l'enregistrement",
        description: ERROR_MESSAGES[code] ?? "Une erreur est survenue.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = "w-full rounded-lg border bg-background px-3 py-2 text-sm"
  const labelClass = "mb-1.5 block text-sm font-medium"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{certificate ? "Modifier le certificat" : "Nouveau certificat"}</DialogTitle>
          <DialogDescription>
            Le numéro de référence (GLZ-année-niveau-séquence) est généré automatiquement.
          </DialogDescription>
        </DialogHeader>

        {isLinked ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Données liées à l&apos;apprenant
            {context.className ? (
              <>
                {" "}
                — classe : <span className="font-semibold">{context.className}</span>
              </>
            ) : null}
            . Les champs repris du dossier (nom, dates) ne sont pas modifiables ; complétez le reste.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className={labelClass}>
              Nom complet<span className="text-destructive"> *</span>
              {isLocked("fullName") ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(apprenant)</span>
              ) : null}
            </span>
            <input
              className={inputClassName(isLocked("fullName"))}
              value={form.fullName}
              readOnly={isLocked("fullName")}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </label>

          <label>
            <span className={labelClass}>
              Date de naissance<span className="text-destructive"> *</span>
              {isLocked("dateOfBirth") ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(apprenant)</span>
              ) : null}
            </span>
            {isLocked("dateOfBirth") ? (
              <div className={inputClassName(true)}>{formatDisplayDate(form.dateOfBirth)}</div>
            ) : (
              <input
                type="date"
                className={inputClassName(false)}
                value={form.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)}
              />
            )}
          </label>

          <label>
            <span className={labelClass}>
              Lieu de naissance<span className="text-destructive"> *</span>
              {isLocked("placeOfBirth") ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(apprenant)</span>
              ) : null}
            </span>
            {isLocked("placeOfBirth") ? (
              <div className={inputClassName(true)}>{form.placeOfBirth || "—"}</div>
            ) : (
              <input
                className={inputClassName(false)}
                value={form.placeOfBirth}
                onChange={(e) => update("placeOfBirth", e.target.value)}
              />
            )}
          </label>

          <label>
            <span className={labelClass}>
              Date de début<span className="text-destructive"> *</span>
              {isLocked("courseStartDate") ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(classe)</span>
              ) : null}
            </span>
            {isLocked("courseStartDate") ? (
              <div className={inputClassName(true)}>{formatDisplayDate(form.courseStartDate)}</div>
            ) : (
              <input
                type="date"
                className={`${inputClassName(false)} ${dateError ? "border-destructive" : ""}`}
                value={form.courseStartDate}
                onChange={(e) => update("courseStartDate", e.target.value)}
              />
            )}
          </label>

          <label>
            <span className={labelClass}>
              Date de fin<span className="text-destructive"> *</span>
              {isLocked("courseEndDate") ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(classe)</span>
              ) : null}
            </span>
            {isLocked("courseEndDate") ? (
              <div className={inputClassName(true)}>{formatDisplayDate(form.courseEndDate)}</div>
            ) : (
              <input
                type="date"
                className={`${inputClassName(false)} ${dateError ? "border-destructive" : ""}`}
                value={form.courseEndDate}
                onChange={(e) => update("courseEndDate", e.target.value)}
              />
            )}
          </label>

          <label>
            <span className={labelClass}>
              Niveau de référence<span className="text-destructive"> *</span>
            </span>
            <select
              className={fieldClass}
              value={form.referenceLevel}
              onChange={(e) => update("referenceLevel", e.target.value as CertificateLevel)}
            >
              {CERTIFICATE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>
              Nombre de leçons (45 min)<span className="text-destructive"> *</span>
            </span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={form.lessonUnits}
              onChange={(e) => update("lessonUnits", e.target.value)}
            />
          </label>

          <label>
            <span className={labelClass}>
              Leçons suivies<span className="text-destructive"> *</span>
            </span>
            <input
              type="number"
              min={0}
              className={`${fieldClass} ${dateError === ERROR_MESSAGES.ATTENDED_GT_UNITS ? "border-destructive" : ""}`}
              value={form.lessonsAttended}
              onChange={(e) => update("lessonsAttended", e.target.value)}
            />
          </label>

          <label>
            <span className={labelClass}>
              Évaluation<span className="text-destructive"> *</span>
            </span>
            <select
              className={fieldClass}
              value={form.evaluation}
              onChange={(e) => update("evaluation", e.target.value as Evaluation)}
            >
              {EVALUATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>
              Info cours<span className="text-destructive"> *</span>
            </span>
            <select
              className={fieldClass}
              value={form.courseInfo}
              onChange={(e) => update("courseInfo", e.target.value as CourseInfo)}
            >
              {COURSE_INFO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>Commentaires</span>
            <textarea
              rows={3}
              className={fieldClass}
              value={form.comments}
              onChange={(e) => update("comments", e.target.value)}
            />
          </label>
        </div>

        {dateError ? <p className="text-xs text-destructive">{dateError}</p> : null}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {certificate ? "Enregistrer" : "Créer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
