"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { CheckCircle2, XCircle } from "lucide-react"
import { ClaimProofActions } from "@/components/claims/claim-proof-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileBackButton } from "@/components/mobile-back-button"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { paymentsService } from "@/domains/payments"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} F CFA`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadge(status: ClaimRecord["status"]) {
  if (status === "en_attente") return <Badge variant="secondary">En attente</Badge>
  if (status === "en_cours") return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">En cours</Badge>
  if (status === "resolue") return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20">Resolue</Badge>
  return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejetee</Badge>
}

export default function ReclamationsValidationPage() {
  const router = useRouter()
  const { role } = useAuth()
  const { t } = useLocale()
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ClaimRecord["status"]>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<{ type: "approve" | "reject"; claim: ClaimRecord } | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    if (role === "accountant") {
      router.replace("/dashboard/comptable/reclamations")
    }
  }, [role, router])

  useEffect(() => {
    const refresh = async () => setClaims(await claimsService.getAll())
    void refresh()
    window.addEventListener("claims-updated", refresh)
    return () => window.removeEventListener("claims-updated", refresh)
  }, [])

  const approveClaim = async (claim: ClaimRecord) => {
    if (claim.status === "resolue") return
    setProcessingId(claim.id)
    setMessage(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await paymentsService.applyClaimPayment({
        claimId: claim.id,
        amount: claim.amount,
        paymentMethod: claim.paymentMethod,
        note: `Paiement reconnu apres verification reclamation ${claim.id}`,
      })
      await claimsService.updateStatus(claim.id, "resolue")
      setClaims(await claimsService.getAll())
      setMessage({ type: "success", text: `Reclamation ${claim.id} validee et paiement applique.` })
    } catch {
      setMessage({ type: "error", text: "Impossible de valider cette reclamation pour le moment." })
    } finally {
      setProcessingId(null)
    }
  }

  const rejectClaim = async (claim: ClaimRecord) => {
    setProcessingId(claim.id)
    setMessage(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await claimsService.updateStatus(claim.id, "rejetee")
      setClaims(await claimsService.getAll())
      setMessage({ type: "success", text: `Reclamation ${claim.id} rejetee.` })
    } catch {
      setMessage({ type: "error", text: "Impossible de rejeter cette reclamation pour le moment." })
    } finally {
      setProcessingId(null)
    }
  }

  if (role === "accountant") {
    return null
  }

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (statusFilter !== "all" && claim.status !== statusFilter) return false
      const claimDate = claim.createdAt.slice(0, 10)
      if (dateFrom && claimDate < dateFrom) return false
      if (dateTo && claimDate > dateTo) return false
      if (!query.trim()) return true
      const haystack = `${claim.id} ${claim.transactionReference} ${claim.phoneNumber} ${claim.description}`.toLowerCase()
      return haystack.includes(query.toLowerCase())
    })
  }, [claims, statusFilter, dateFrom, dateTo, query])

  const pageCount = Math.max(1, Math.ceil(filteredClaims.length / pageSize))
  const pagedClaims = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredClaims.slice(start, start + pageSize)
  }, [filteredClaims, page, pageSize])

  function resetFilters() {
    setQuery("")
    setStatusFilter("all")
    setDateFrom("")
    setDateTo("")
  }

  function exportClaimsCsv() {
    if (filteredClaims.length === 0) {
      setMessage({ type: "error", text: "Aucune reclamation a exporter avec les filtres actuels." })
      return
    }
    const header = "id,date,montant,methode,numero,reference,statut,description"
    const rows = filteredClaims.map((claim) =>
      [claim.id, claim.createdAt, String(claim.amount), claim.paymentMethod, claim.phoneNumber, claim.transactionReference, claim.status, claim.description]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `reclamations-admin-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage({ type: "success", text: `${filteredClaims.length} reclamation(s) exportee(s).` })
  }

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, dateFrom, dateTo, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  return (
    <div className="space-y-5 p-4 md:p-6">
      <MobileBackButton />
      <div
        className={`fixed top-16 left-1/2 z-[110] w-[92%] max-w-xl -translate-x-1/2 rounded-xl border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur transition-all duration-300 ${
          processingId || message ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        } ${
          processingId
            ? "border-primary/30"
            : message?.type === "success"
              ? "border-green-500/25"
              : message?.type === "error"
                ? "border-destructive/30"
                : "border-border"
        }`}
      >
        {processingId ? (
          <div>
            <p className="text-sm font-medium text-foreground">Traitement de la reclamation en cours...</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        ) : message ? (
          <p className={`text-sm font-medium ${message.type === "success" ? "text-green-700" : "text-destructive"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
      <div className="rounded-xl bg-gradient-to-r from-primary to-accent p-5 text-primary-foreground shadow-md">
        <h1 className="text-xl font-bold md:text-2xl">Validation des reclamations</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">
          {role === "manager" ? t("reclam_subtitle_mgr") : t("reclam_subtitle_admin")}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Reclamations recues</CardTitle>
            <Button variant="outline" onClick={exportClaimsCsv}>Exporter CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher (ref, numero, texte...)" className="lg:col-span-2" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | ClaimRecord["status"])}>
              <SelectTrigger>
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="resolue">Resolue</SelectItem>
                <SelectItem value="rejetee">Rejetee</SelectItem>
              </SelectContent>
            </Select>
            <Input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} type="date" />
            <Input value={dateTo} onChange={(e) => setDateTo(e.target.value)} type="date" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={resetFilters}>Reinitialiser filtres</Button>
            <Label className="text-xs text-muted-foreground">Par page</Label>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredClaims.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Aucune reclamation a traiter.
            </div>
          ) : (
            pagedClaims.map((claim) => (
              <div key={claim.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{claim.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(claim.createdAt)}</p>
                  </div>
                  {statusBadge(claim.status)}
                </div>

                <p className="mt-2 text-sm">
                  Montant debite: <span className="font-semibold">{formatFcfa(claim.amount)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Moyen: {claim.paymentMethod === "orange_money" ? "Orange Money" : "MTN Mobile Money"} - Numero: {claim.phoneNumber}
                </p>
                <p className="text-sm text-muted-foreground">Reference: {claim.transactionReference}</p>
                <p className="mt-2 text-sm text-muted-foreground">{claim.description}</p>

                {claim.screenshotDataUrl ? (
                  <ClaimProofActions
                    className="mt-2"
                    claimId={claim.id}
                    screenshotDataUrl={claim.screenshotDataUrl}
                    screenshotName={claim.screenshotName}
                    viewLabel={t("recl_view_cap")}
                    downloadLabel={t("recl_download_cap")}
                    previewTitle={t("recl_proof_preview_title")}
                  />
                ) : null}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="sm:min-w-40"
                    onClick={() => setDialog({ type: "approve", claim })}
                    disabled={claim.status === "resolue" || claim.status === "rejetee" || processingId !== null}
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Accepter et appliquer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectReason("")
                      setDialog({ type: "reject", claim })
                    }}
                    disabled={claim.status === "resolue" || claim.status === "rejetee" || processingId !== null}
                  >
                    <XCircle className="mr-2 size-4" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))
          )}
          {filteredClaims.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <p>{filteredClaims.length} reclamation(s) • page {page}/{pageCount}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Precedent</Button>
                <Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Suivant</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.type === "approve" ? "Valider la reclamation ?" : "Rejeter la reclamation ?"}</DialogTitle>
            <DialogDescription>
              {dialog ? `Action sur ${dialog.claim.id} (${formatFcfa(dialog.claim.amount)}).` : ""}
            </DialogDescription>
          </DialogHeader>
          {dialog?.type === "reject" ? (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motif du rejet</Label>
              <Input id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex: reference introuvable, preuve insuffisante..." />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
            <Button
              onClick={async () => {
                if (!dialog) return
                if (dialog.type === "approve") {
                  await approveClaim(dialog.claim)
                  setDialog(null)
                  return
                }
                if (!rejectReason.trim()) {
                  setMessage({ type: "error", text: "Le motif de rejet est obligatoire." })
                  return
                }
                await rejectClaim(dialog.claim)
                setMessage({ type: "success", text: `Reclamation ${dialog.claim.id} rejetee. Motif: ${rejectReason}` })
                setDialog(null)
              }}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

