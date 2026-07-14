"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react"
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
import { classesService, type StaffClass } from "@/domains/classes"
import { learnersService } from "@/domains/learners"
import { buildCertifiedLearnerMatcher, isFormationCertificate } from "@/lib/certificate-learner-match"

interface BatchRow {
  learnerId: string
  fullName: string
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: CertificateLevel
  lessonUnits: number
  lessonsAttended: number
  courseInfo: CourseInfo
  evaluation: Evaluation
  comments: string
  include: boolean
}

interface BatchResult {
  fullName: string
  success: boolean
  message: string
}

const SERVICE_ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_CERTIFICATE: "Un certificat similaire existe déjà",
  END_BEFORE_START: "Date de fin antérieure à la date de début",
  ATTENDED_GT_UNITS: "Leçons suivies supérieures au total",
  PLACE_REQUIRED: "Lieu de naissance manquant",
  BIRTHDATE_REQUIRED: "Date de naissance manquante",
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() <= new Date(bEnd).getTime() && new Date(aEnd).getTime() >= new Date(bStart).getTime()
}

const inputClass = "w-full rounded-md border bg-background px-2 py-1 text-xs"
const cellClass = "px-2 py-1.5 align-middle"
const lockedCellClass = "whitespace-nowrap text-muted-foreground"

function formatBatchDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR")
}

export function CertificateBatchDialog({
  open,
  onOpenChange,
  createMeta,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  createMeta?: CertificateCreateMeta
  onCreated?: () => void
}) {
  const [classes, setClasses] = useState<StaffClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [rows, setRows] = useState<BatchRow[]>([])
  const [existing, setExisting] = useState<Certificate[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<BatchResult[] | null>(null)

  // Valeurs par défaut appliquées à toutes les lignes pour réduire la saisie.
  const [defLevel, setDefLevel] = useState<CertificateLevel>("A1")
  const [defUnits, setDefUnits] = useState(60)
  const [defEvaluation, setDefEvaluation] = useState<Evaluation>("Good")
  const [defCourseInfo, setDefCourseInfo] = useState<CourseInfo>("Complete level")

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  )

  useEffect(() => {
    if (!open) return
    setLoadingClasses(true)
    Promise.all([classesService.list({ pageSize: 200 }), certificatesService.getAll()])
      .then(([classList, certs]) => {
        setClasses(classList)
        setExisting(certs)
      })
      .catch(() => toast({ title: "Chargement impossible", variant: "destructive" }))
      .finally(() => setLoadingClasses(false))
  }, [open])

  function reset() {
    setSelectedClassId("")
    setRows([])
    setResults(null)
    setCreating(false)
    setLoadingRows(false)
  }

  function handleClose(next: boolean) {
    if (creating) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSelectClass(classId: string) {
    setSelectedClassId(classId)
    setResults(null)
    setRows([])
    if (!classId) return
    setLoadingRows(true)
    try {
      const learners = await learnersService.list({ classId, pageSize: 200 })
      // Exclure seulement ceux qui ont déjà une attestation pour CETTE classe.
      const isCertified = buildCertifiedLearnerMatcher(existing, { classId })
      const eligible = learners.filter((l) => !isCertified(l))
      const excludedCount = learners.length - eligible.length
      setRows(
        eligible.map((l) => ({
          learnerId: l.id,
          fullName: l.fullName,
          dateOfBirth: (l.dateOfBirth ?? "").slice(0, 10),
          placeOfBirth: (l.placeOfBirth ?? "").trim(),
          referenceLevel: defLevel,
          lessonUnits: defUnits,
          lessonsAttended: defUnits,
          courseInfo: defCourseInfo,
          evaluation: defEvaluation,
          comments: "",
          include: true,
        })),
      )
      if (learners.length === 0) {
        toast({ title: "Aucun apprenant dans cette classe" })
      } else if (eligible.length === 0) {
        toast({ title: "Tous les apprenants de cette classe ont déjà une attestation pour cette classe" })
      } else if (excludedCount > 0) {
        toast({
          title: `${excludedCount} apprenant(s) déjà certifié(s) exclu(s)`,
          description: `${eligible.length} apprenant(s) sans certificat proposé(s).`,
        })
      }
    } catch {
      toast({ title: "Impossible de charger les apprenants", variant: "destructive" })
    } finally {
      setLoadingRows(false)
    }
  }

  function updateRow(index: number, patch: Partial<BatchRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function applyDefaultsToAll() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        referenceLevel: defLevel,
        lessonUnits: defUnits,
        lessonsAttended: Math.min(r.lessonsAttended, defUnits) || defUnits,
        evaluation: defEvaluation,
        courseInfo: defCourseInfo,
      })),
    )
  }

  // Validation par ligne (formats + doublons existants + doublons dans le lot).
  const errorsByIndex = useMemo(() => {
    const map = new Map<number, string>()
    const start = selectedClass?.periodStart ?? ""
    const end = selectedClass?.periodEnd ?? ""
    const batchKeys = new Map<string, number>()

    rows.forEach((row) => {
      if (!row.include) return
      const key = `${normalizeName(row.fullName)}|${row.dateOfBirth}|${row.referenceLevel}`
      batchKeys.set(key, (batchKeys.get(key) ?? 0) + 1)
    })

    rows.forEach((row, index) => {
      if (!row.include) return
      if (!row.dateOfBirth) return void map.set(index, "Date de naissance manquante")
      if (!row.placeOfBirth.trim()) return void map.set(index, "Lieu de naissance manquant")
      if (!start || !end) return void map.set(index, "Dates de la classe manquantes")
      if (new Date(end).getTime() < new Date(start).getTime()) {
        return void map.set(index, "Période de classe incohérente")
      }
      if (row.lessonsAttended > row.lessonUnits) {
        return void map.set(index, "Leçons suivies > total")
      }

      const key = `${normalizeName(row.fullName)}|${row.dateOfBirth}|${row.referenceLevel}`
      if ((batchKeys.get(key) ?? 0) > 1) {
        return void map.set(index, "Doublon dans la sélection")
      }

      const dup = existing.find(
        (c) =>
          isFormationCertificate(c) &&
          c.classId === selectedClass.id &&
          ((row.learnerId && c.learnerId === row.learnerId) ||
            (normalizeName(c.fullName) === normalizeName(row.fullName) &&
              c.dateOfBirth === row.dateOfBirth &&
              c.referenceLevel === row.referenceLevel &&
              periodsOverlap(c.courseStartDate, c.courseEndDate, start, end))),
      )
      if (dup) return void map.set(index, "Certificat déjà existant")
    })

    return map
  }, [rows, existing, selectedClass])

  const includedCount = rows.filter((r) => r.include).length
  const validCount = rows.filter((r, i) => r.include && !errorsByIndex.has(i)).length
  const invalidCount = includedCount - validCount

  async function handleCreate() {
    if (!selectedClass) return
    const toCreate = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => r.include && !errorsByIndex.has(i))
    if (toCreate.length === 0) {
      toast({ title: "Aucune ligne valide à créer", variant: "destructive" })
      return
    }
    setCreating(true)
    const out: BatchResult[] = []
    try {
      for (const { r } of toCreate) {
        const input: CreateCertificateInput = {
          fullName: r.fullName,
          dateOfBirth: r.dateOfBirth,
          placeOfBirth: r.placeOfBirth,
          referenceLevel: r.referenceLevel,
          courseStartDate: selectedClass.periodStart,
          courseEndDate: selectedClass.periodEnd,
          lessonUnits: r.lessonUnits,
          lessonsAttended: r.lessonsAttended,
          courseInfo: r.courseInfo,
          evaluation: r.evaluation,
          comments: r.comments,
          learnerId: r.learnerId,
          classId: selectedClass.id,
          className: selectedClass.name,
        }
        try {
          const created = await certificatesService.create(input, createMeta)
          out.push({ fullName: r.fullName, success: true, message: created.referenceNumber })
        } catch (e) {
          const code = e instanceof Error ? e.message : ""
          out.push({ fullName: r.fullName, success: false, message: SERVICE_ERROR_MESSAGES[code] ?? "Erreur" })
        }
      }
      const ok = out.filter((r) => r.success).length
      setResults(out)
      toast({ title: `Génération terminée : ${ok}/${out.length} certificat(s) créé(s)` })
      if (ok > 0) onCreated?.()
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Générer des certificats pour une classe</DialogTitle>
          <DialogDescription>
            Sélectionnez une classe : ses apprenants sans certificat sont chargés et pré-remplis (ceux qui ont
            déjà un certificat sont exclus). Le nom et la date de naissance viennent du dossier apprenant ; les dates
            de cours sont celles de la classe — ces champs ne sont pas modifiables. Ajustez uniquement le reste dans
            le tableau, puis créez les certificats
            certificats
            {createMeta?.createdByRole === "manager"
              ? " (soumis pour validation admin)"
              : " (en brouillon)"}
            . Les doublons et formats sont vérifiés avant la création.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-muted-foreground">Classe</span>
            <select
              value={selectedClassId}
              onChange={(e) => void handleSelectClass(e.target.value)}
              disabled={loadingClasses || creating}
              className="min-w-56 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">{loadingClasses ? "Chargement…" : "— Choisir une classe —"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === "finished" ? "(terminée)" : ""}
                </option>
              ))}
            </select>
          </label>
          {selectedClass ? (
            <span className="pb-1 text-xs text-muted-foreground">
              Période : {selectedClass.periodStart?.slice(0, 10) || "—"} → {selectedClass.periodEnd?.slice(0, 10) || "—"}
            </span>
          ) : null}
        </div>

        {rows.length > 0 && !results ? (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-2">
            <span className="self-center text-xs font-semibold text-muted-foreground">Valeurs par défaut :</span>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Niveau</span>
              <select value={defLevel} onChange={(e) => setDefLevel(e.target.value as CertificateLevel)} className={inputClass}>
                {CERTIFICATE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Nb leçons</span>
              <input
                type="number"
                min={0}
                value={defUnits}
                onChange={(e) => setDefUnits(Number.parseInt(e.target.value, 10) || 0)}
                className={`${inputClass} w-20`}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Évaluation</span>
              <select
                value={defEvaluation}
                onChange={(e) => setDefEvaluation(e.target.value as Evaluation)}
                className={inputClass}
              >
                {EVALUATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Info cours</span>
              <select
                value={defCourseInfo}
                onChange={(e) => setDefCourseInfo(e.target.value as CourseInfo)}
                className={inputClass}
              >
                {COURSE_INFO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={applyDefaultsToAll}
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50"
            >
              Appliquer à toutes les lignes
            </button>
          </div>
        ) : null}

        {loadingRows ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement des apprenants…
          </div>
        ) : null}

        {rows.length > 0 && !results ? (
          <>
            <div className="flex gap-3 text-sm">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700">
                {validCount} prêt(s)
              </span>
              {invalidCount > 0 ? (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700">
                  {invalidCount} en erreur
                </span>
              ) : null}
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-lg border">
              <table className="w-full min-w-[1180px] text-xs">
                <thead className="sticky top-0 z-10 bg-muted/70 text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className={cellClass}></th>
                    <th className={cellClass}>Nom</th>
                    <th className={cellClass}>Naissance</th>
                    <th className={cellClass}>Début</th>
                    <th className={cellClass}>Fin</th>
                    <th className={cellClass}>Lieu</th>
                    <th className={cellClass}>Niveau</th>
                    <th className={cellClass}>Leçons</th>
                    <th className={cellClass}>Suivies</th>
                    <th className={cellClass}>Info cours</th>
                    <th className={cellClass}>Évaluation</th>
                    <th className={cellClass}>Commentaires</th>
                    <th className={cellClass}>État</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const error = errorsByIndex.get(i)
                    return (
                      <tr key={row.learnerId} className={`border-t ${row.include ? "" : "opacity-40"}`}>
                        <td className={cellClass}>
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(e) => updateRow(i, { include: e.target.checked })}
                            aria-label={`Inclure ${row.fullName}`}
                          />
                        </td>
                        <td className={`${cellClass} whitespace-nowrap font-medium`}>{row.fullName}</td>
                        <td className={cellClass}>
                          <span className={lockedCellClass} title="Dossier apprenant">
                            {formatBatchDate(row.dateOfBirth)}
                          </span>
                        </td>
                        <td className={cellClass}>
                          <span className={lockedCellClass} title="Période de la classe">
                            {selectedClass ? formatBatchDate(selectedClass.periodStart) : "—"}
                          </span>
                        </td>
                        <td className={cellClass}>
                          <span className={lockedCellClass} title="Période de la classe">
                            {selectedClass ? formatBatchDate(selectedClass.periodEnd) : "—"}
                          </span>
                        </td>
                        <td className={cellClass}>
                          <input
                            value={row.placeOfBirth}
                            onChange={(e) => updateRow(i, { placeOfBirth: e.target.value })}
                            placeholder="Lieu"
                            className={`${inputClass} w-28`}
                          />
                        </td>
                        <td className={cellClass}>
                          <select
                            value={row.referenceLevel}
                            onChange={(e) => updateRow(i, { referenceLevel: e.target.value as CertificateLevel })}
                            className={`${inputClass} w-16`}
                          >
                            {CERTIFICATE_LEVELS.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={cellClass}>
                          <input
                            type="number"
                            min={0}
                            value={row.lessonUnits}
                            onChange={(e) => updateRow(i, { lessonUnits: Number.parseInt(e.target.value, 10) || 0 })}
                            className={`${inputClass} w-16`}
                          />
                        </td>
                        <td className={cellClass}>
                          <input
                            type="number"
                            min={0}
                            value={row.lessonsAttended}
                            onChange={(e) => updateRow(i, { lessonsAttended: Number.parseInt(e.target.value, 10) || 0 })}
                            className={`${inputClass} w-16`}
                          />
                        </td>
                        <td className={cellClass}>
                          <select
                            value={row.courseInfo}
                            onChange={(e) => updateRow(i, { courseInfo: e.target.value as CourseInfo })}
                            className={`${inputClass} w-40`}
                          >
                            {COURSE_INFO_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={cellClass}>
                          <select
                            value={row.evaluation}
                            onChange={(e) => updateRow(i, { evaluation: e.target.value as Evaluation })}
                            className={`${inputClass} w-32`}
                          >
                            {EVALUATION_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={cellClass}>
                          <input
                            value={row.comments}
                            onChange={(e) => updateRow(i, { comments: e.target.value })}
                            placeholder="—"
                            className={`${inputClass} w-36`}
                          />
                        </td>
                        <td className={cellClass}>
                          {!row.include ? (
                            <span className="text-muted-foreground">Ignoré</span>
                          ) : error ? (
                            <span className="inline-flex items-center gap-1 text-red-700" title={error}>
                              <XCircle className="size-3.5" /> {error}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="size-3.5" /> Prêt
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {results ? (
          <div className="max-h-[50vh] overflow-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-xs">
              <thead className="sticky top-0 bg-muted/60 text-left uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className={cellClass}>Nom</th>
                  <th className={cellClass}>Statut</th>
                  <th className={cellClass}>Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className={`${cellClass} font-medium`}>{r.fullName}</td>
                    <td className={cellClass}>
                      {r.success ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <XCircle className="size-4 text-red-600" />
                      )}
                    </td>
                    <td className={`${cellClass} ${r.success ? "font-mono" : "text-red-700"}`}>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleClose(false)}
            disabled={creating}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            {results ? "Fermer" : "Annuler"}
          </button>
          {!results ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || validCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Créer {validCount > 0 ? `${validCount} certificat(s)` : ""}
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
