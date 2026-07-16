"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { CertificateFormDialog, type CertificatePrefill } from "@/components/admin/certificate-form-dialog"
import { CertificateImportDialog } from "@/components/admin/certificate-import-dialog"
import { CertificateLearnerPickerDialog } from "@/components/admin/certificate-learner-picker-dialog"
import { CertificateBatchDialog } from "@/components/admin/certificate-batch-dialog"
import { CertificateSignatureDialog } from "@/components/admin/certificate-signature-dialog"
import { downloadCertificatePdf, downloadFormationCertificatePdf } from "@/lib/certificate-pdf"
import {
  approvalBlockedReason,
  canApproveCertificate,
  canDeleteCertificate,
  canDownloadCertificate,
  canEditCertificate,
  canPreviewCertificate,
  isTrainingFinishedForApproval,
  statusLabel,
} from "@/lib/certificate-permissions"
import { certificatesService, type Certificate, type CertificateCreateMeta } from "@/domains/certificates"
import { classesService, type StaffClass } from "@/domains/classes"
import { useAuth } from "@/components/auth-provider"
import type { UserRole } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ROWS_PER_PAGE = 10

type PageMode = "admin" | "manager"
type StatusFilter = "" | Certificate["status"]

function isFormationCertificate(c: Certificate): boolean {
  return (c.certificateKind ?? "formation") !== "scolarite"
}

function formatDate(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR")
}

function StatusBadge({ status }: { status: Certificate["status"] }) {
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

export function CertificatesPage({ mode }: { mode: PageMode }) {
  const { session } = useAuth()
  const staffUserId = session?.staffUserId
  const actorRole: UserRole = mode === "admin" ? "admin" : "manager"
  const createMeta: CertificateCreateMeta = useMemo(
    () => ({ createdByRole: actorRole, createdByStaffId: staffUserId }),
    [actorRole, staffUserId],
  )

  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState("")
  const [searchReference, setSearchReference] = useState("")
  const [filterClassId, setFilterClassId] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterStatus, setFilterStatus] = useState<StatusFilter>(mode === "admin" ? "" : "")
  const [page, setPage] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [editing, setEditing] = useState<Certificate | null>(null)
  const [prefill, setPrefill] = useState<CertificatePrefill | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [classList, setClassList] = useState<StaffClass[]>([])
  const [toDelete, setToDelete] = useState<Certificate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const classesById = useMemo(
    () => Object.fromEntries(classList.map((c) => [c.id, c])),
    [classList],
  )

  const pendingCount = useMemo(
    () =>
      certificates.filter(
        (c) => isFormationCertificate(c) && (c.status === "en_attente" || c.status === "brouillon"),
      ).length,
    [certificates],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await certificatesService.getAll()
      setCertificates(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const handler = () => void refresh()
    window.addEventListener("certificates-updated", handler)
    return () => window.removeEventListener("certificates-updated", handler)
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    classesService
      .list({ pageSize: 200 })
      .then((classes) => {
        if (cancelled) return
        setClassList(classes)
      })
      .catch(() => {
        /* non bloquant */
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleApprove(certificate: Certificate) {
    setPublishingId(certificate.id)
    try {
      await certificatesService.approve(certificate.id, staffUserId)
      toast({
        title: "Certificat approuvé",
        description: `${certificate.fullName} — ${certificate.referenceNumber}. Téléchargement autorisé.`,
      })
      await refresh()
    } catch {
      toast({ title: "Approbation impossible", variant: "destructive" })
    } finally {
      setPublishingId(null)
    }
  }

  async function handleRevoke(certificate: Certificate) {
    setPublishingId(certificate.id)
    try {
      await certificatesService.revoke(certificate.id)
      toast({
        title: "Approbation retirée",
        description: `${certificate.fullName} — ${certificate.referenceNumber}`,
      })
      await refresh()
    } catch {
      toast({ title: "Action impossible", variant: "destructive" })
    } finally {
      setPublishingId(null)
    }
  }

  const filtered = useMemo(() => {
    const name = searchName.trim().toLowerCase()
    const ref = searchReference.trim().toLowerCase()
    const dateKey = filterDate ? new Date(filterDate).toDateString() : ""
    return certificates.filter((c) => {
      if (!isFormationCertificate(c)) return false
      if (name && !c.fullName.toLowerCase().includes(name)) return false
      if (ref && !c.referenceNumber.toLowerCase().includes(ref)) return false
      if (filterClassId && c.classId !== filterClassId) return false
      if (filterStatus && c.status !== filterStatus) return false
      if (dateKey) {
        const start = c.courseStartDate ? new Date(c.courseStartDate) : null
        if (!start || Number.isNaN(start.getTime()) || start.toDateString() !== dateKey) return false
      }
      return true
    })
  }, [certificates, searchName, searchReference, filterClassId, filterDate, filterStatus])

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

  async function handleDownload(certificate: Certificate) {
    if (!canDownloadCertificate(certificate)) {
      toast({
        title: "Téléchargement indisponible",
        description: "Le certificat doit être approuvé par un administrateur.",
        variant: "destructive",
      })
      return
    }
    setDownloadingId(certificate.id)
    try {
      await downloadFormationCertificatePdf(certificate, undefined, (id) =>
        certificatesService.getById(id),
      )
    } catch {
      toast({ title: "Échec de génération du PDF", variant: "destructive" })
    } finally {
      setDownloadingId(null)
    }
  }

  async function handlePreview(certificate: Certificate) {
    if (!canPreviewCertificate(actorRole, certificate)) return
    setPreviewingId(certificate.id)
    try {
      await downloadCertificatePdf(certificate, { preview: true })
    } catch {
      toast({ title: "Échec de l'aperçu PDF", variant: "destructive" })
    } finally {
      setPreviewingId(null)
    }
  }

  const selectedCertificates = useMemo(
    () => certificates.filter((c) => selected.includes(c.id) && isFormationCertificate(c)),
    [certificates, selected],
  )

  const selectedApprovable = useMemo(
    () =>
      selectedCertificates.filter(
        (c) =>
          canApproveCertificate(actorRole) &&
          c.status !== "disponible" &&
          isTrainingFinishedForApproval(c, classesById),
      ),
    [actorRole, classesById, selectedCertificates],
  )

  const selectedDownloadable = useMemo(
    () => selectedCertificates.filter((c) => canDownloadCertificate(c)),
    [selectedCertificates],
  )

  async function handleApproveSelected() {
    if (selectedApprovable.length === 0) {
      toast({
        title: "Aucun certificat approuvable",
        description: "Sélectionnez des certificats en attente dont la formation est terminée.",
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
          await certificatesService.approve(certificate.id, staffUserId)
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

  async function handleGenerateSelected() {
    const items = selectedDownloadable
    if (items.length === 0) {
      toast({
        title: "Aucun certificat téléchargeable",
        description: "Seuls les certificats approuvés (disponibles) peuvent être téléchargés.",
        variant: "destructive",
      })
      return
    }
    setGenerating(true)
    let ok = 0
    try {
      for (const certificate of items) {
        try {
          await downloadFormationCertificatePdf(certificate, undefined, (id) =>
            certificatesService.getById(id),
          )
          ok += 1
        } catch {
          /* continue */
        }
        await new Promise((r) => setTimeout(r, 400))
      }
      toast({ title: `${ok}/${items.length} PDF téléchargé(s)` })
    } finally {
      setGenerating(false)
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await certificatesService.remove(toDelete.id)
      setSelected((prev) => prev.filter((id) => id !== toDelete.id))
      toast({ title: "Certificat supprimé" })
      await refresh()
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      toast({
        title: "Échec de la suppression",
        description:
          code === "CERTIFICATE_LOCKED"
            ? "Vous n'avez pas le droit de supprimer ce certificat approuvé."
            : undefined,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  const isAdmin = mode === "admin"

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title="Attestations de formation"
        subtitle={
          isAdmin
            ? "Créez, validez et gérez les attestations de fin de formation. L'approbation admin est requise avant tout téléchargement."
            : "Créez des attestations pour vos apprenants. Un administrateur doit les approuver avant téléchargement."
        }
        gradientClassName="from-blue-600 via-indigo-600 to-violet-600"
        actions={
          <>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setSignatureOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
              >
                <PenLine className="size-3.5" /> Signature
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setBatchOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
            >
              <Users className="size-3.5" /> Générer pour une classe
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
            >
              <UserPlus className="size-3.5" /> Générer pour un apprenant
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
              >
                <Upload className="size-3.5" /> Importer
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setPrefill(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
            >
              <Plus className="size-3.5" /> Nouveau certificat
            </button>
          </>
        }
      />

      {isAdmin && pendingCount > 0 ? (
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">
          <span className="font-semibold">{pendingCount}</span> certificat(s) en attente de validation.
          <button
            type="button"
            onClick={() => {
              setFilterStatus("en_attente")
              setPage(0)
            }}
            className="ml-2 font-medium underline-offset-2 hover:underline"
          >
            Voir la file
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1">
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
        <div className="relative lg:col-span-1">
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
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as StatusFilter)
            setPage(0)
          }}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="brouillon">Brouillon</option>
          <option value="disponible">Disponible</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => {
            setFilterDate(e.target.value)
            setPage(0)
          }}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          aria-label="Filtrer par date de début"
        />
      </div>

      {(searchName || searchReference || filterClassId || filterDate || filterStatus) ? (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSearchName("")
              setSearchReference("")
              setFilterClassId("")
              setFilterDate("")
              setFilterStatus("")
              setPage(0)
            }}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Réinitialiser les filtres
          </button>
          <span className="text-xs text-muted-foreground">{filtered.length} résultat(s)</span>
        </div>
      ) : null}

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
              onClick={() => void handleGenerateSelected()}
              disabled={generating || selectedDownloadable.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Télécharger {selectedDownloadable.length || selected.length} PDF
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tout sélectionner" />
                </th>
                <th className="px-4 py-3">Nom complet</th>
                <th className="px-4 py-3">N° de référence</th>
                <th className="px-4 py-3">Niveau</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Statut</th>
                {isAdmin ? <th className="px-4 py-3">Créé par</th> : null}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t">
                      {Array.from({ length: isAdmin ? 9 : 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : pageItems.map((c) => {
                    const trainingFinished = isTrainingFinishedForApproval(c, classesById)
                    const downloadable = canDownloadCertificate(c)
                    const previewable = canPreviewCertificate(actorRole, c)
                    const editable = canEditCertificate(actorRole, c)
                    const deletable = canDeleteCertificate(actorRole, c)
                    const approvable =
                      canApproveCertificate(actorRole) && c.status !== "disponible" && trainingFinished
                    const approveTitle = trainingFinished
                      ? "Approuver (rendre téléchargeable)"
                      : approvalBlockedReason(c, classesById)

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
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {c.referenceLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(c.courseStartDate)}</td>
                        <td className="px-4 py-3">{formatDate(c.courseEndDate)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        {isAdmin ? (
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {c.createdByRole === "manager" ? "Manager" : "Admin"}
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {downloadable ? (
                              <button
                                type="button"
                                onClick={() => void handleDownload(c)}
                                disabled={downloadingId === c.id}
                                title="Télécharger le PDF"
                                className="rounded-md border p-1.5 hover:bg-muted/50 disabled:opacity-50"
                              >
                                {downloadingId === c.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <FileText className="size-4" />
                                )}
                              </button>
                            ) : previewable ? (
                              <button
                                type="button"
                                onClick={() => void handlePreview(c)}
                                disabled={previewingId === c.id}
                                title="Aperçu (non validé)"
                                className="rounded-md border p-1.5 hover:bg-muted/50 disabled:opacity-50"
                              >
                                {previewingId === c.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="En attente d'approbation admin"
                                className="cursor-not-allowed rounded-md border p-1.5 opacity-40"
                              >
                                <FileText className="size-4" />
                              </button>
                            )}

                            {canApproveCertificate(actorRole) ? (
                              c.status === "disponible" ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRevoke(c)}
                                  disabled={publishingId === c.id}
                                  title="Retirer l'approbation"
                                  className="rounded-md border border-green-300 bg-green-50 p-1.5 text-green-700 hover:bg-green-100 disabled:opacity-50"
                                >
                                  {publishingId === c.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-4" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleApprove(c)}
                                  disabled={!approvable || publishingId === c.id}
                                  title={approveTitle}
                                  className="rounded-md border p-1.5 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {publishingId === c.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-4" />
                                  )}
                                </button>
                              )
                            ) : c.status === "en_attente" ? (
                              <span title="En attente de validation admin" className="rounded-md border p-1.5 opacity-50">
                                <XCircle className="size-4 text-muted-foreground" />
                              </span>
                            ) : null}

                            {editable ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(c)
                                  setPrefill(null)
                                  setFormOpen(true)
                                }}
                                title="Modifier"
                                className="rounded-md border p-1.5 hover:bg-muted/50"
                              >
                                <Pencil className="size-4" />
                              </button>
                            ) : null}

                            {deletable ? (
                              <button
                                type="button"
                                onClick={() => setToDelete(c)}
                                title="Supprimer"
                                className="rounded-md border p-1.5 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
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
            title="Aucun certificat"
            description={
              isAdmin
                ? "Créez un nouveau certificat ou validez ceux soumis par les managers."
                : "Créez un certificat pour un apprenant ou une classe entière."
            }
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

      <CertificateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        certificate={editing}
        prefill={prefill}
        createMeta={createMeta}
        onSaved={() => void refresh()}
      />

      <CertificateLearnerPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(p) => {
          setEditing(null)
          setPrefill(p)
          setFormOpen(true)
        }}
      />

      <CertificateBatchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        createMeta={createMeta}
        onCreated={() => void refresh()}
      />

      {isAdmin ? (
        <CertificateImportDialog open={importOpen} onOpenChange={setImportOpen} createMeta={createMeta} onImported={() => void refresh()} />
      ) : null}

      {isAdmin ? <CertificateSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} /> : null}

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce certificat ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `${toDelete.fullName} — ${toDelete.referenceNumber}. Cette action est irréversible.${
                    toDelete.status === "disponible"
                      ? " L'apprenant ne pourra plus télécharger cette attestation."
                      : ""
                  }`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
