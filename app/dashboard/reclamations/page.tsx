"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Paperclip, Send, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { claimsService, type ClaimPaymentMethod, type ClaimRecord } from "@/domains/claims"

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

export default function ReclamationsPage() {
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<ClaimPaymentMethod>("orange_money")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [transactionReference, setTransactionReference] = useState("")
  const [description, setDescription] = useState("")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const refresh = async () => setClaims(await claimsService.getAll())
    void refresh()
    window.addEventListener("claims-updated", refresh)
    return () => window.removeEventListener("claims-updated", refresh)
  }, [])

  const submitClaim = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await claimsService.create({
        amount: Number(amount),
        paymentMethod,
        phoneNumber,
        transactionReference,
        description,
        screenshotFile,
      })
      setClaims(await claimsService.getAll())
      setAmount("")
      setPhoneNumber("")
      setTransactionReference("")
      setDescription("")
      setScreenshotFile(null)
      setMessage({ type: "success", text: "Votre reclamation a ete envoyee avec succes." })
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN"
      if (code === "INVALID_AMOUNT") setMessage({ type: "error", text: "Veuillez saisir un montant valide." })
      else if (code === "PHONE_REQUIRED") setMessage({ type: "error", text: "Numero debite obligatoire." })
      else if (code === "REFERENCE_REQUIRED") setMessage({ type: "error", text: "Reference transaction obligatoire." })
      else if (code === "DESCRIPTION_REQUIRED") setMessage({ type: "error", text: "Expliquez le probleme rencontre." })
      else setMessage({ type: "error", text: "Impossible d'envoyer la reclamation pour le moment." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MobileBackButton />
      <div
        className={`fixed top-16 left-1/2 z-[110] w-[92%] max-w-xl -translate-x-1/2 rounded-xl border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur transition-all duration-300 ${
          submitting || message ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        } ${
          submitting
            ? "border-primary/30"
            : message?.type === "success"
              ? "border-green-500/25"
              : message?.type === "error"
                ? "border-destructive/30"
                : "border-border"
        }`}
      >
        {submitting ? (
          <div>
            <p className="text-sm font-medium text-foreground">Envoi de la reclamation en cours...</p>
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
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
        <div className="p-5 md:p-6">
          <h1 className="text-xl font-bold md:text-2xl">Reclamations</h1>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Signalez un paiement debite mais non valide, avec capture d'ecran de confirmation Orange/MTN.
          </p>
        </div>
        <div className="bg-black/10 px-5 py-3 md:px-6 text-xs text-primary-foreground/90">
          Vous pouvez suivre chaque reclamation jusqu'a sa validation ou son rejet.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-primary/15 shadow-sm overflow-hidden">
          {submitting ? (
            <div className="h-1 w-full overflow-hidden bg-primary/10">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
          ) : null}
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-primary" />
              Nouvelle reclamation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claim-amount">Montant debite</Label>
                <Input
                  id="claim-amount"
                  type="number"
                  placeholder="Ex: 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Moyen de paiement</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ClaimPaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez un moyen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="debited-phone">Numero debite</Label>
                <Input
                  id="debited-phone"
                  type="tel"
                  placeholder="6XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction-ref">Reference transaction</Label>
                <Input
                  id="transaction-ref"
                  placeholder="Ex: OMF123456789"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-description">Description du probleme</Label>
              <Textarea
                id="claim-description"
                placeholder="Ex: Paiement valide par Orange Money, compte debite, mais non visible dans l'application."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-file">Capture d'ecran (Orange/MTN)</Label>
              <Input
                id="claim-file"
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
              />
              {screenshotFile ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="size-3" /> {screenshotFile.name}
                </p>
              ) : null}
            </div>

            {message ? (
              <div
                className={
                  message.type === "success"
                    ? "rounded-xl border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
                    : "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                }
              >
                {message.text}
              </div>
            ) : null}

            <Button className="sm:min-w-44" onClick={submitClaim} disabled={submitting}>
              <Send className="mr-2 size-4" />
              {submitting ? "Envoi..." : "Envoyer la reclamation"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/15 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-4 text-primary" />
              Conseils
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>- Saisissez le meme numero que celui debite.</p>
            <p>- Ajoutez la reference exacte du SMS de transaction.</p>
            <p>- Joignez une capture lisible du SMS/notif de debit.</p>
            <p>- Notre equipe traite les reclamations par ordre d'arrivee.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Suivi de mes reclamations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {claims.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              Aucune reclamation pour le moment.
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="rounded-xl border p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{claim.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(claim.createdAt)}</p>
                  </div>
                  {statusBadge(claim.status)}
                </div>
                <p className="mt-2 text-sm">
                  Montant debite: <span className="font-semibold">{formatFcfa(claim.amount)}</span> -{" "}
                  {claim.paymentMethod === "orange_money" ? "Orange Money" : "MTN Mobile Money"}
                </p>
                <p className="text-sm text-muted-foreground">Reference: {claim.transactionReference}</p>
                <p className="mt-2 text-sm text-muted-foreground">{claim.description}</p>
                {claim.screenshotDataUrl ? (
                  <a
                    href={claim.screenshotDataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                  >
                    <Paperclip className="size-3" />
                    Voir la capture {claim.screenshotName ? `(${claim.screenshotName})` : ""}
                  </a>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

