"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Download, Eye, FileText, Loader2, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { SchoolCertificateTemplateDialog } from "@/components/admin/school-certificate-template-dialog"
import { downloadSchoolCertificatePdf } from "@/lib/school-certificate-pdf"
import { syncSchoolCertificatesForLearners } from "@/lib/school-certificate-provision"
import { isApiDataProvider } from "@/lib/data-provider"
import { resolveSchoolCertificateTuitionFullyPaid } from "@/lib/school-certificate-tuition"
import {
  canDownloadSchoolCertificate,
  schoolCertificatePaymentLabel,
} from "@/lib/school-certificate-permissions"
import { statusLabel } from "@/lib/certificate-permissions"
import { schoolCertificatesService, type SchoolCertificate } from "@/domains/school-certificates"
import { classesService, type StaffClass } from "@/domains/classes"
import { learnersService, type StaffLearner } from "@/domains/learners"
import { useAuth } from "@/components/auth-provider"
import { ADMIN_FINANCIAL_REFRESH_EVENTS, CERTIFICATES_UPDATED_EVENT } from "@/lib/admin-data-events"
import { SCHOOL_CERT_TEMPLATE_UPDATED_EVENT } from "@/services/school-certificate-template.service"
import type { UserRole } from "@/types"

const ROWS_PER_PAGE = 10

type PageMode = "admin" | "manager"

function formatDate(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR")
}

function StatusBadge({ status }: { status: SchoolCertificate["status"] }) {
  if (status === "disponible") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
        <CheckCircle2 className="size-3" /> {statusLabel(status)}
      </span>
    )
  }
  if (status === "en_attente") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
        {statusLabel(status)}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      {statusLabel(status)}
    </span>
  )
}

export function SchoolCertificatesPage({ mode }: { mode: PageMode }) {
  const { session } = useAuth()
  const staffUserId = session?.staffUserId
  const actorRole: UserRole = mode === "admin" ? "admin" : "manager"
  const isAdmin = mode === "admin"

  const [certificates, setCertificates] = useState<SchoolCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState("")
  const [searchReference, setSearchReference] = useState("")
  const [filterClassId, setFilterClassId] = useState("")
  const [page, setPage] = useState(0)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [learnersById, setLearnersById] = useState<Record<string, StaffLearner>>({})
  const [classList, setClassList] = useState<StaffClass[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)

  const classesById = useMemo(
    () => Object.fromEntries(classList.map((c) => [c.id, c])),
    [classList],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await schoolCertificatesService.list()
      setCertificates(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const handler = () => void refresh()
    const events = [
      CERTIFICATES_UPDATED_EVENT,
      SCHOOL_CERT_TEMPLATE_UPDATED_EVENT,
      ...ADMIN_FINANCIAL_REFRESH_EVENTS,
    ]
    for (const name of events) {
      window.addEventListener(name, handler)
    }
    return () => {
      for (const name of events) {
        window.removeEventListener(name, handler)
      }
    }
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    classesService
      .list({ pageSize: 200 })
      .then((classes) => {
        if (!cancelled) setClassList(classes)
      })
      .catch(() => {
        /* non bloquant */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    learnersService
      .list({ pageSize: 500 })
      .then(async (learners) => {
        if (cancelled) return
        setLearnersById(Object.fromEntries(learners.map((l) => [l.id, l])))
        if (isApiDataProvider()) {
          await schoolCertificatesService.syncAll()
        } else {
          syncSchoolCertificatesForLearners(learners, classesById)
        }
        void refresh()
      })
      .catch(() => {
        /* non bloquant */
      })
    return () => {
      cancelled = true
    }
  }, [classesById, refresh])

  const filtered = useMemo(() => {
    const name = searchName.trim().toLowerCase()
    const ref = searchReference.trim().toLowerCase()
    return certificates.filter((c) => {
      if (name && !c.fullName.toLowerCase().includes(name)) return false
      if (ref && !c.referenceNumber.toLowerCase().includes(ref)) return false
      if (filterClassId && c.classId !== filterClassId) return false
      return true
    })
  }, [certificates, searchName, searchReference, filterClassId])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(currentPage * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE + ROWS_PER_PAGE)

  const allChecked = pageItems.length > 0 && pageItems.every((c) => selected.includes(c.id))

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (allChecked) {
      setSelected((prev) => prev.filter((id) => !pageItems.some((c) => c.id === id)))
    } else {
      setSelected((prev) => [...new Set([...prev, ...pageItems.map((c) => c.id)])])
    }
  }

  const selectedCertificates = useMemo(
    () => certificates.filter((c) => selected.includes(c.id)),
    [certificates, selected],
  )

  const selectedApprovable = useMemo(
    () => (isAdmin ? selectedCertificates.filter((c) => c.status !== "disponible") : []),
    [isAdmin, selectedCertificates],
  )

  async function handleApprove(certificate: SchoolCertificate) {
    if (!isAdmin || certificate.status === "disponible") return
    setPublishingId(certificate.id)
    try {
      await schoolCertificatesService.approve(certificate.id, staffUserId)
      toast({
        title: "Certificat approuvé",
        description: `${certificate.fullName} — ${certificate.referenceNumber}`,
      })
      await refresh()
    } catch {
      toast({ title: "Approbation impossible", variant: "destructive" })
    } finally {
      setPublishingId(null)
    }
  }

  async function handleApproveSelected() {
    if (selectedApprovable.length === 0) {
      toast({
        title: "Aucun certificat à approuver",
        description: "Sélectionnez des certificats en attente ou en brouillon.",
        variant: "destructive",
      })
      return
    }
    setBulkApproving(true)
    let ok = 0
    let failed = 0
    try {
      for (const certificate of selectedApprovable) {
        try {
          await schoolCertificatesService.approve(certificate.id, staffUserId)
          ok += 1
        } catch {
          failed += 1
        }
      }
      toast({
        title: `${ok} certificat(s) approuvé(s)`,
        description: failed > 0 ? `${failed} échec(s)` : undefined,
        variant: failed > 0 && ok === 0 ? "destructive" : "default",
      })
      setSelected((prev) => prev.filter((id) => !selectedApprovable.some((c) => c.id === id)))
      await refresh()
    } finally {
      setBulkApproving(false)
    }
  }

  async function handleDownload(certificate: SchoolCertificate) {
    const learner = certificate.learnerId ? learnersById[certificate.learnerId] : undefined
    let tuitionFullyPaid = resolveSchoolCertificateTuitionFullyPaid(certificate, learner, classList)

    if (isApiDataProvider() && actorRole === "manager") {
      try {
        const eligibility = await schoolCertificatesService.getDownloadEligibility(certificate.id)
        tuitionFullyPaid = eligibility.tuitionFullyPaid
        if (!eligibility.allowed) {
          toast({
            title: "Téléchargement indisponible",
            description: eligibility.reason ?? "Pension non soldée ou modèle non validé.",
            variant: "destructive",
          })
          return
        }
      } catch {
        toast({ title: "Impossible de vérifier l'éligibilité", variant: "destructive" })
        return
      }
    }

    const decision = canDownloadSchoolCertificate(actorRole, certificate, { tuitionFullyPaid })
    if (!decision.allowed) {
      toast({
        title: "Téléchargement indisponible",
        description: decision.reason,
        variant: "destructive",
      })
      return
    }
    setDownloadingId(certificate.id)
    try {
      await downloadSchoolCertificatePdf(certificate)
    } catch {
      toast({ title: "Échec de génération du PDF", variant: "destructive" })
    } finally {
      setDownloadingId(null)
    }
  }

  async function handlePreview(certificate: SchoolCertificate) {
    if (actorRole !== "admin") return
    setPreviewingId(certificate.id)
    try {
      await downloadSchoolCertificatePdf(certificate, { preview: true, draftWatermark: "APERÇU" })
    } catch {
      toast({ title: "Échec de l'aperçu PDF", variant: "destructive" })
    } finally {
      setPreviewingId(null)
    }
  }

  async function handleDownloadSelected() {
    if (selectedCertificates.length === 0) return
    setGenerating(true)
    let ok = 0
    let skipped = 0
    try {
      for (const certificate of selectedCertificates) {
        const learner = certificate.learnerId ? learnersById[certificate.learnerId] : undefined
        let tuitionFullyPaid = resolveSchoolCertificateTuitionFullyPaid(certificate, learner, classList)

        if (isApiDataProvider() && actorRole === "manager") {
          try {
            const eligibility = await schoolCertificatesService.getDownloadEligibility(certificate.id)
            tuitionFullyPaid = eligibility.tuitionFullyPaid
            if (!eligibility.allowed) {
              skipped += 1
              continue
            }
          } catch {
            skipped += 1
            continue
          }
        }

        const decision = canDownloadSchoolCertificate(actorRole, certificate, { tuitionFullyPaid })
        if (!decision.allowed) {
          // Admin : aperçu si non téléchargeable « officiel »
          if (actorRole === "admin") {
            try {
              await downloadSchoolCertificatePdf(certificate, {
                preview: true,
                draftWatermark: "APERÇU",
              })
              ok += 1
            } catch {
              skipped += 1
            }
          } else {
            skipped += 1
          }
          await new Promise((r) => setTimeout(r, 350))
          continue
        }

        try {
          await downloadSchoolCertificatePdf(certificate)
          ok += 1
        } catch {
          skipped += 1
        }
        await new Promise((r) => setTimeout(r, 350))
      }
      toast({
        title: `${ok} PDF téléchargé(s)`,
        description: skipped > 0 ? `${skipped} ignoré(s)` : undefined,
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title="Certificats de scolarité"
        subtitle={
          isAdmin
            ? "Sélectionnez plusieurs certificats pour les approuver ou les télécharger en une fois. Modèle global : cachet et signature."
            : "Téléchargement autorisé uniquement si la pension est soldée (l'administrateur peut toujours télécharger)."
        }
        gradientClassName="from-emerald-600 via-teal-600 to-cyan-600"
        actions={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setTemplateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
            >
              <FileText className="size-3.5" /> Modèle du document
            </button>
          ) : null
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value)
              setPage(0)
            }}
            placeholder="Rechercher par nom"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchReference}
            onChange={(e) => {
              setSearchReference(e.target.value)
              setPage(0)
            }}
            placeholder="N° de référence"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={filterClassId}
          onChange={(e) => {
            setFilterClassId(e.target.value)
            setPage(0)
          }}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les classes</option>
          {classList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {selected.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">{selected.length} sélectionné(s)</span>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void handleApproveSelected()}
                disabled={bulkApproving || selectedApprovable.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {bulkApproving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Approuver {selectedApprovable.length || selected.length}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleDownloadSelected()}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Télécharger {selected.length} PDF
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="px-4 py-3">Nom complet</th>
                <th className="px-4 py-3">N° de référence</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Pension</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : pageItems.map((c) => {
                    const learner = c.learnerId ? learnersById[c.learnerId] : undefined
                    const tuitionFullyPaid = resolveSchoolCertificateTuitionFullyPaid(c, learner, classList)
                    const decision = canDownloadSchoolCertificate(actorRole, c, { tuitionFullyPaid })
                    const previewable = actorRole === "admin" && !decision.allowed
                    const approvable = isAdmin && c.status !== "disponible"

                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(c.id)}
                            onChange={() => toggleOne(c.id)}
                            aria-label={`Sélectionner ${c.fullName}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{c.fullName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.referenceNumber}</td>
                        <td className="px-4 py-3">{c.className ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(c.courseStartDate)} → {formatDate(c.courseEndDate)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              tuitionFullyPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {schoolCertificatePaymentLabel(tuitionFullyPaid)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {decision.allowed ? (
                              <button
                                type="button"
                                onClick={() => void handleDownload(c)}
                                disabled={downloadingId === c.id}
                                title="Télécharger le PDF"
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted/50 disabled:opacity-50"
                              >
                                {downloadingId === c.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Download className="size-3.5" />
                                )}
                                PDF
                              </button>
                            ) : previewable ? (
                              <button
                                type="button"
                                onClick={() => void handlePreview(c)}
                                disabled={previewingId === c.id}
                                title="Aperçu admin"
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted/50 disabled:opacity-50"
                              >
                                {previewingId === c.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Eye className="size-3.5" />
                                )}
                                Aperçu
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground" title={decision.reason}>
                                Indisponible
                              </span>
                            )}

                            {approvable ? (
                              <button
                                type="button"
                                onClick={() => void handleApprove(c)}
                                disabled={publishingId === c.id}
                                title="Approuver"
                                className="rounded-md border p-1.5 hover:bg-muted/50 disabled:opacity-50"
                              >
                                {publishingId === c.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 ? (
          <AdminEmptyState
            title="Aucun certificat de scolarité"
            description="Les certificats sont créés automatiquement lors de l'inscription des apprenants."
          />
        ) : null}
      </div>

      {!loading && pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-md border px-2 py-1 disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-muted-foreground">
            Page {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            className="rounded-md border px-2 py-1 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      ) : null}

      {isAdmin ? (
        <SchoolCertificateTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
      ) : null}
    </div>
  )
}
