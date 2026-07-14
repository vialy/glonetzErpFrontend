"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Eye, FileText, Loader2, Search } from "lucide-react"
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
import { schoolCertificatesService, type SchoolCertificate } from "@/domains/school-certificates"
import { classesService, type StaffClass } from "@/domains/classes"
import { learnersService, type StaffLearner } from "@/domains/learners"
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

export function SchoolCertificatesPage({ mode }: { mode: PageMode }) {
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

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

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title="Certificats de scolarité"
        subtitle={
          isAdmin
            ? "Un certificat par apprenant, généré automatiquement à l'inscription. Modifiez le modèle global et validez cachet/signature."
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

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nom complet</th>
                <th className="px-4 py-3">N° de référence</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Pension</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t">
                      {Array.from({ length: 6 }).map((__, j) => (
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

                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{c.fullName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.referenceNumber}</td>
                        <td className="px-4 py-3">{c.className ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(c.courseStartDate)} → {formatDate(c.courseEndDate)}
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
