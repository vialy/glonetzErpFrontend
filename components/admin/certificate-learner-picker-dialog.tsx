"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { learnersService, type StaffLearner } from "@/domains/learners"
import { classesService, type StaffClass } from "@/domains/classes"
import { certificatesService } from "@/domains/certificates"
import { buildCertifiedLearnerMatcher } from "@/lib/certificate-learner-match"
import type { CertificatePrefill } from "@/components/admin/certificate-form-dialog"

export function CertificateLearnerPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (prefill: CertificatePrefill) => void
}) {
  const [learners, setLearners] = useState<StaffLearner[]>([])
  const [classesById, setClassesById] = useState<Record<string, StaffClass>>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setSearch("")
    Promise.all([
      learnersService.list({ pageSize: 200 }),
      classesService.list({ pageSize: 200 }),
      certificatesService.getAll(),
    ])
      .then(([learnerList, classList, certificates]) => {
        if (cancelled) return
        // Exclure seulement si une attestation existe déjà pour la classe actuelle de l'apprenant.
        const isCertified = buildCertifiedLearnerMatcher(certificates)
        setLearners(learnerList.filter((l) => !isCertified(l)))
        setClassesById(Object.fromEntries(classList.map((c) => [c.id, c])))
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Impossible de charger les apprenants", variant: "destructive" })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return learners
    return learners.filter(
      (l) => l.fullName.toLowerCase().includes(q) || (l.className ?? "").toLowerCase().includes(q),
    )
  }, [learners, search])

  function handlePick(learner: StaffLearner) {
    const klass = learner.classId ? classesById[learner.classId] : undefined
    onPick({
      fullName: learner.fullName,
      dateOfBirth: learner.dateOfBirth,
      placeOfBirth: learner.placeOfBirth,
      courseStartDate: klass?.periodStart,
      courseEndDate: klass?.periodEnd,
      learnerId: learner.id,
      classId: learner.classId,
      className: learner.className ?? klass?.name,
    })
    onOpenChange(false)
  }

  const cellClass = "px-3 py-2"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Générer un certificat pour un apprenant</DialogTitle>
          <DialogDescription>
            Sélectionnez un apprenant : son nom, sa date de naissance et les dates de sa classe seront pré-remplis
            et ne pourront pas être modifiés. Les apprenants ayant déjà une attestation pour leur
            classe actuelle ne sont pas proposés.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou classe"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement des apprenants…
          </div>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className={cellClass}>Apprenant</th>
                  <th className={cellClass}>Classe</th>
                  <th className={cellClass}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((learner) => (
                  <tr key={learner.id} className="border-t">
                    <td className={`${cellClass} font-medium`}>{learner.fullName}</td>
                    <td className={cellClass}>{learner.className ?? "—"}</td>
                    <td className={`${cellClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => handlePick(learner)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        <Sparkles className="size-3.5" /> Générer
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {search.trim()
                        ? "Aucun apprenant trouvé."
                        : "Aucun apprenant éligible (attestation déjà existante pour sa classe actuelle)."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
