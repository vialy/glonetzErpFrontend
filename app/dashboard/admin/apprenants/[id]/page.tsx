"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  Ban,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  GraduationCap,
  KeyRound,
  Loader2,
  Pencil,
  Phone,
  Receipt,
  User,
  Wrench,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ActionFeedbackOverlay } from "@/components/admin/action-feedback-overlay"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DeskPaymentDialog } from "@/components/desk-payment/desk-payment-dialog"
import { MobileBackButton } from "@/components/mobile-back-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminClassesQuery } from "@/hooks/use-admin-classes"
import { useAdminLearnersQuery } from "@/hooks/use-admin-learners"
import { useActionFeedback } from "@/hooks/use-action-feedback"
import { useAdminPayments } from "@/hooks/use-admin-payments"
import { useLocale } from "@/hooks/use-locale"
import { learnersService } from "@/domains/learners"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import {
  fetchStaffPayments,
  getStaffPaymentById,
  recordManualPayment,
} from "@/services/staff-payments.service"
import {
  formatFcfa,
  getClassById,
  getPaymentsForLearner,
  recordAdminDeskPayment,
  resetLearnerPin,
  sendLearnerPinSmsMock,
  setLearnerStatus,
  updateLearner,
  type AdminLearner,
  type AdminPaymentItem,
} from "@/services/admin-mock.service"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"

function paymentStatusLabel(p: AdminPaymentItem): string {
  if (p.status === "success") return "Valide"
  if (p.status === "pending") return "En attente de validation"
  return "Saisie manuelle"
}

function methodLabelPdf(method: AdminPaymentItem["method"]): string {
  if (method === "Especes") return "Especes (guichet)"
  return method === "Orange" ? "Orange Money" : "MTN Mobile Money"
}

async function downloadPaymentReceiptPdf(
  payment: AdminPaymentItem,
  learner: { fullName: string; phone: string },
) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

  const logoDataUrl = await fetch("/images/logo.png")
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
          reader.readAsDataURL(blob)
        }),
    )
    .catch(() => "")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 16
  const right = pageWidth - 16

  doc.setFillColor(124, 58, 237)
  doc.rect(0, 0, pageWidth, 42, "F")
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", left, 9, 28, 10)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text("Recu de paiement", left, 28)
  doc.setFontSize(10)
  const refHead = payment.operatorReference
    ? `Ref. operateur: ${sanitizeTextForPdf(payment.operatorReference)}`
    : `ID interne: ${sanitizeTextForPdf(payment.id)}`
  doc.text(refHead, left, 35)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(11)
  let y = 52
  const row = (label: string, value: string) => {
    const safe = sanitizeTextForPdf(value)
    doc.setTextColor(71, 85, 105)
    doc.text(label, left, y)
    doc.setTextColor(15, 23, 42)
    doc.text(safe, right, y, { align: "right" })
    doc.setDrawColor(226, 232, 240)
    doc.line(left, y + 2, right, y + 2)
    y += 10
  }

  row("Apprenant", learner.fullName)
  row("Telephone", learner.phone)
  row("Classe", payment.className)
  row("Date", payment.createdAt)
  row("Mode de paiement", methodLabelPdf(payment.method))
  row("Montant", formatFcfaForPdf(payment.amount))
  row("Statut", paymentStatusLabel(payment))
  row("ID transaction", payment.id)
  if (payment.note) row("Note", payment.note)

  if (payment.status === "pending") {
    y += 4
    doc.setFontSize(9)
    doc.setTextColor(180, 83, 9)
    doc.text(
      sanitizeTextForPdf("Document informatif — paiement en attente de validation administrative."),
      left,
      y,
    )
    y += 8
  }

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(left, y + 4, right - left, 14, 2, 2, "F")
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(9)
  doc.text(sanitizeTextForPdf("Recu genere depuis l'espace administrateur Glonetz."), left + 4, y + 13)

  doc.save(`recu-paiement-${payment.id}.pdf`)
}

function payStatusBadge(p: AdminPaymentItem) {
  if (p.status === "success") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-800">
        <CheckCircle2 className="mr-1 size-3" />
        Valide
      </Badge>
    )
  }
  if (p.status === "pending") {
    return (
      <Badge className="bg-amber-500/15 text-amber-800">
        <Clock3 className="mr-1 size-3" />
        En attente
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Wrench className="size-3" />
      Manuel
    </Badge>
  )
}

export default function AdminApprenantFichePage() {
  const { t } = useLocale()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const { learners, loading: learnersLoading } = useAdminLearnersQuery()
  const { classes: adminClasses } = useAdminClassesQuery()
  const paymentsVersion = useAdminPayments()

  const [learner, setLearner] = useState<(AdminLearner & { className?: string }) | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setLearner(null)
        setLoadingDetail(false)
        return
      }

      const fromList = learners.find((l) => l.id === id)
      if (fromList) {
        setLearner(fromList)
        setLoadingDetail(false)
        return
      }

      if (isApiDataProvider()) {
        if (learnersLoading) {
          setLoadingDetail(true)
          return
        }
        setLoadingDetail(true)
        try {
          const item = await learnersService.get(id)
          if (!cancelled) setLearner(item)
        } catch {
          if (!cancelled) setLearner(null)
        } finally {
          if (!cancelled) setLoadingDetail(false)
        }
        return
      }

      if (!cancelled) {
        setLearner(null)
        setLoadingDetail(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id, learners, learnersLoading])

  const [paymentHistory, setPaymentHistory] = useState<AdminPaymentItem[]>([])

  useEffect(() => {
    if (!learner) {
      setPaymentHistory([])
      return
    }

    // Mode API : historique reel de l'apprenant via GET /staff/payments?userId=...
    if (isApiDataProvider()) {
      let cancelled = false
      const load = () => {
        fetchStaffPayments({ userId: learner.id })
          .then((items) => {
            if (!cancelled) setPaymentHistory(items)
          })
          .catch(() => {
            if (!cancelled) setPaymentHistory([])
          })
      }
      load()
      window.addEventListener("admin-payments-updated", load)
      return () => {
        cancelled = true
        window.removeEventListener("admin-payments-updated", load)
      }
    }

    // Mode mock : filtre local.
    setPaymentHistory(getPaymentsForLearner(learner.id, learner.fullName))
  }, [learner, paymentsVersion])

  const [editOpen, setEditOpen] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<"active" | "suspended" | null>(null)

  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDob, setFormDob] = useState("")

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const { feedback, close, run } = useActionFeedback()
  const [paymentDetail, setPaymentDetail] = useState<AdminPaymentItem | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [deskOpen, setDeskOpen] = useState(false)

  function openEdit() {
    if (!learner) return
    setFormName(learner.fullName)
    setFormPhone(learner.phone)
    setFormClassId(learner.classId)
    setFormDob(learner.dateOfBirth)
    setEditOpen(true)
    setBanner(null)
  }

  const editIsDirty = useMemo(() => {
    if (!learner) return false
    if (isApiDataProvider()) {
      return formName.trim() !== learner.fullName.trim() || formClassId !== learner.classId
    }
    return (
      formName.trim() !== learner.fullName.trim() ||
      formPhone.trim() !== learner.phone.trim() ||
      formClassId !== learner.classId ||
      formDob !== (learner.dateOfBirth ?? "")
    )
  }, [learner, formName, formPhone, formClassId, formDob])

  function saveEdit() {
    if (!learner) return
    setSaving(true)
    void (async () => {
      const outcome = await run(
        async () => {
          if (!formName.trim()) throw new Error("Nom obligatoire")
          if (!formPhone.trim()) throw new Error("Telephone obligatoire")
          if (!formClassId) throw new Error("Classe obligatoire")

          if (isApiDataProvider()) {
            const updated = await learnersService.update(learner.id, {
              name: formName.trim(),
              ...(formClassId !== learner.classId ? { classId: formClassId } : {}),
            })
            if (!updated) throw new Error(t("lrn_fiche_edit_fail"))
            setLearner(updated)
            return updated
          }

          const updated = updateLearner(learner.id, {
            fullName: formName.trim(),
            phone: formPhone.trim(),
            classId: formClassId,
            dateOfBirth: formDob,
          })
          setLearner(updated)
          return updated
        },
        {
          loading: t("lrn_fiche_edit_saving"),
          success: t("lrn_fiche_edit_ok"),
          error: t("lrn_fiche_edit_fail"),
        },
      )

      setSaving(false)
      if (outcome.ok) {
        setEditOpen(false)
      } else if (outcome.error instanceof Error) {
        setBanner({
          type: "error",
          text: getApiErrorMessage(outcome.error, outcome.error.message),
        })
      }
    })()
  }

  function confirmPinReset() {
    if (!learner) return
    void (async () => {
      try {
        if (isApiDataProvider()) {
          await learnersService.regeneratePassword(learner.id)
          setBanner({
            type: "success",
            text: t("lrn_fiche_reset_pwd_ok"),
          })
        } else {
          const { pin, phone } = resetLearnerPin(learner.id)
          sendLearnerPinSmsMock(phone, pin)
          setBanner({
            type: "success",
            text: t("lrn_fiche_reset_pwd_ok"),
          })
        }
        setPinDialogOpen(false)
      } catch (e) {
        setBanner({
          type: "error",
          text: getApiErrorMessage(e, t("lrn_fiche_reset_pwd_err")),
        })
      }
    })()
  }

  async function openPaymentDetail(p: AdminPaymentItem) {
    setPaymentDetail(p)
    // Mode API : on rafraichit la ligne via GET /staff/payments/:id (statut a jour).
    if (isApiDataProvider()) {
      try {
        const fresh = await getStaffPaymentById(p.id)
        if (fresh) setPaymentDetail(fresh)
      } catch {
        // On garde la ligne issue de la liste si le detail echoue.
      }
    }
  }

  async function handleDownloadPaymentPdf() {
    if (!learner || !paymentDetail) return
    setPdfLoading(true)
    try {
      await downloadPaymentReceiptPdf(paymentDetail, {
        fullName: learner.fullName,
        phone: learner.phone,
      })
    } catch {
      setBanner({ type: "error", text: "Impossible de generer le PDF pour le moment." })
    } finally {
      setPdfLoading(false)
    }
  }

  function confirmStatusChange() {
    if (!learner || !pendingStatus) return
    const nextStatus = pendingStatus
    void (async () => {
      try {
        if (isApiDataProvider()) {
          const updated = await learnersService.setActive(learner.id, nextStatus === "active")
          if (updated) setLearner(updated)
          else setLearner({ ...learner, status: nextStatus })
        } else {
          setLearnerStatus(learner.id, nextStatus)
          setLearner({ ...learner, status: nextStatus })
        }
        setBanner({
          type: "success",
          text: nextStatus === "active" ? "Compte active." : "Compte suspendu.",
        })
      } catch (e) {
        setBanner({
          type: "error",
          text: getApiErrorMessage(e, "Impossible de modifier le statut."),
        })
      } finally {
        setStatusDialogOpen(false)
        setPendingStatus(null)
      }
    })()
  }

  if (loadingDetail) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground md:px-6">
        <Loader2 className="size-4 animate-spin" />
        {t("adm_set_loading")}
      </div>
    )
  }

  if (!learner) {
    return (
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/admin/apprenants" />
        <p className="mt-4 text-muted-foreground">Apprenant introuvable.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/admin/apprenants">Retour liste</Link>
        </Button>
      </div>
    )
  }

  const adminClass =
    adminClasses.find((c) => c.id === learner?.classId) ??
    (!isApiDataProvider() ? getClassById(learner?.classId ?? "") : undefined)
  const classLabel =
    learner?.className ||
    adminClass?.name ||
    (!isApiDataProvider() ? getClassById(learner?.classId ?? "")?.name : "") ||
    learner?.classId ||
    ""
  const dueAmount =
    learner && learner.due > 0
      ? learner.due
      : (adminClass?.tuitionAmount ?? 0)
  // En mode API, /staff/users/:id ne renvoie pas le total deja paye : on le
  // derive des paiements reels (encaisses : reussis + versements guichet).
  const paidAmount = isApiDataProvider()
    ? paymentHistory
        .filter((p) => p.status === "success" || p.status === "manual")
        .reduce((sum, p) => sum + p.amount, 0)
    : (learner?.paid ?? 0)
  const ratio = dueAmount > 0 ? Math.min(100, Math.round((paidAmount / dueAmount) * 100)) : 0
  const reste = Math.max(0, dueAmount - paidAmount)

  return (
    <div className="px-4 pb-10 pt-4 md:px-6 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/admin/apprenants" />
      <AdminPageHeader
        title={learner.fullName}
        subtitle={`Fiche apprenant · ${learner.id}`}
        gradientClassName="from-violet-600 to-fuchsia-600"
        actions={
          <Button variant="outline" size="sm" asChild className="border-primary-foreground/40 bg-white/10 text-primary-foreground hover:bg-white/20">
            <Link href="/dashboard/admin/apprenants">
              <ArrowLeft className="mr-2 size-4" />
              Liste
            </Link>
          </Button>
        }
      />

      {banner ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identite</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Pencil className="mr-2 size-3.5" />
                Modifier
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPinDialogOpen(true)}>
                <KeyRound className="mr-2 size-3.5" />
                {t("lrn_fiche_reset_pwd_btn")}
              </Button>
              {reste > 0 ? (
                <Button size="sm" onClick={() => setDeskOpen(true)}>
                  <Banknote className="mr-2 size-3.5" />
                  Versement guichet
                </Button>
              ) : null}
              {learner.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setPendingStatus("suspended")
                    setStatusDialogOpen(true)
                  }}
                >
                  <Ban className="mr-2 size-3.5" />
                  Suspendre
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-600/50 text-emerald-800"
                  onClick={() => {
                    setPendingStatus("active")
                    setStatusDialogOpen(true)
                  }}
                >
                  <CheckCircle2 className="mr-2 size-3.5" />
                  Activer
                </Button>
              )}
            </div>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Nom</dt>
              <dd className="font-medium">{learner.fullName}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Telephone</dt>
              <dd className="font-mono">{learner.phone}</dd>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Classe</dt>
              <dd>
                {learner.classId ? (
                  <Link
                    href={`/dashboard/admin/classes/${learner.classId}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {classLabel}
                  </Link>
                ) : (
                  classLabel
                )}
              </dd>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Date de naissance : </span>
              <span className="font-medium">{learner.dateOfBirth}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {learner.status === "active" ? (
                <Badge className="bg-emerald-500/15 text-emerald-800">Actif</Badge>
              ) : (
                <Badge variant="secondary">Suspendu</Badge>
              )}
              {learner.pinInitialized ? <Badge variant="outline">PIN initialise</Badge> : null}
              {learner.mustChangePin ? <Badge variant="destructive">PIN a changer</Badge> : null}
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paiement (synthese)</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Du</span>
              <span className="font-semibold tabular-nums">{formatFcfa(dueAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paye</span>
              <span className="font-semibold tabular-nums text-emerald-700">{formatFcfa(paidAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Reste</span>
              <span className="font-bold tabular-nums text-rose-700">{formatFcfa(reste)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                style={{ width: `${ratio}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {dueAmount > 0 ? `${ratio}% du montant regle` : "Pension de classe non renseignee"}
            </p>
          </div>
        </div>
      </div>

      {/* Historique paiements */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Historique des paiements</h2>
            <span className="text-xs text-muted-foreground">({paymentHistory.length})</span>
          </div>
          {reste > 0 ? (
            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setDeskOpen(true)}>
              <Banknote className="mr-2 size-3.5" />
              Versement guichet
            </Button>
          ) : null}
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucun paiement enregistre pour cet apprenant.
                  </TableCell>
                </TableRow>
              ) : (
                paymentHistory.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.operatorReference ?? p.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.createdAt}</TableCell>
                    <TableCell>{p.className}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatFcfa(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{payStatusBadge(p)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openPaymentDetail(p)}>
                        <Eye className="mr-1 size-3.5" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {paymentHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun paiement enregistre.</p>
          ) : (
            paymentHistory.map((p) => (
              <div key={p.id} className="rounded-xl border bg-muted/20 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xs">{p.operatorReference ?? p.id}</p>
                  {payStatusBadge(p)}
                </div>
                <p className="mt-1 font-semibold tabular-nums">{formatFcfa(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {methodLabelPdf(p.method)} · {p.createdAt}
                </p>
                <p className="text-xs text-muted-foreground">{p.className}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void openPaymentDetail(p)}
                >
                  <Eye className="mr-2 size-3.5" />
                  Detail et recu PDF
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={paymentDetail !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentDetail(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail du paiement</DialogTitle>
            <DialogDescription>
              Informations de la ligne selectionnee. Vous pouvez telecharger un recu PDF pour archivage.
            </DialogDescription>
          </DialogHeader>
          {paymentDetail && learner ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">ID transaction</dt>
                    <dd className="font-mono text-right text-xs">{paymentDetail.id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Reference operateur</dt>
                    <dd className="text-right font-mono text-xs">
                      {paymentDetail.operatorReference ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="text-right">{paymentDetail.createdAt}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Classe</dt>
                    <dd className="text-right">{paymentDetail.className}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Montant</dt>
                    <dd className="text-right font-semibold tabular-nums">{formatFcfa(paymentDetail.amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Methode</dt>
                    <dd className="text-right">{methodLabelPdf(paymentDetail.method)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Statut</dt>
                    <dd className="text-right">{payStatusBadge(paymentDetail)}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Apprenant</p>
                <p>{learner.fullName}</p>
                <p className="font-mono">{learner.phone}</p>
              </div>
              {paymentDetail.status === "pending" ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Ce paiement est en attente : le recu PDF est fourni a titre informatif jusqu&apos;a validation.
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setPaymentDetail(null)}>
              Fermer
            </Button>
            <Button type="button" onClick={() => void handleDownloadPaymentPdf()} disabled={pdfLoading || !paymentDetail}>
              <Download className="mr-2 size-4" />
              {pdfLoading ? "Generation..." : "Telecharger le recu PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;apprenant</DialogTitle>
            <DialogDescription>
              {isApiDataProvider()
                ? "Nom et classe modifiables. Le telephone ne peut pas etre change apres creation."
                : "Mise a jour locale (mock admin). Les paiements affichent le meme nom."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nom complet</Label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Telephone</Label>
              <Input
                id="edit-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                readOnly={isApiDataProvider()}
                disabled={isApiDataProvider()}
                className={isApiDataProvider() ? "bg-muted" : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Classe</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dob">Date de naissance</Label>
              <Input id="edit-dob" type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveEdit} disabled={saving || !editIsDirty}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("lrn_fiche_edit_saving")}
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lrn_fiche_reset_pwd_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lrn_fiche_reset_pwd_desc").replace("{phone}", learner.phone)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPinReset}>{t("lrn_fiche_reset_pwd_confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === "suspended" ? "Suspendre le compte ?" : "Reactiver le compte ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "suspended"
                ? "L'apprenant ne pourra plus se connecter tant que le compte reste suspendu."
                : "Le compte redeviendra accessible immediatement."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeskPaymentDialog
        open={deskOpen}
        onClose={() => setDeskOpen(false)}
        onSuccess={() => setBanner({ type: "success", text: "Versement enregistre." })}
        fullName={learner.fullName}
        remaining={reste}
        onRecord={async (amount, method, note) => {
          if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT")
          if (amount > reste) throw new Error("OVERPAY")
          if (isApiDataProvider()) {
            await recordManualPayment({
              userId: learner.id,
              classId: learner.classId,
              amount,
              note,
            })
          } else {
            recordAdminDeskPayment(learner.id, amount, method, note)
          }
        }}
        t={t}
      />

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
