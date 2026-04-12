"use client"

import { useEffect, useMemo, useState } from "react"
import { CreditCard, CircleCheck, ReceiptText, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileBackButton } from "@/components/mobile-back-button"
import {
  paymentsService,
  type PaymentMethod,
  type StudentPaymentRecord,
  type StudentTuitionSummary,
} from "@/domains/payments"
import { ApiClientError } from "@/core/api/client"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} F CFA`
}

export default function EffectuerPaiementPage() {
  const [summary, setSummary] = useState<StudentTuitionSummary>({
    studentName: "Etudiant Demo",
    className: "A1",
    totalTuition: 0,
    amountPaid: 0,
    remainingAmount: 0,
  })
  const [amountInput, setAmountInput] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("orange_money")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [lastPayment, setLastPayment] = useState<StudentPaymentRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const refresh = async () => setSummary(await paymentsService.getSummary())
    void refresh()
    window.addEventListener("student-payments-updated", refresh)
    return () => window.removeEventListener("student-payments-updated", refresh)
  }, [])

  const remainingAfterInput = useMemo(() => {
    const amount = Number(amountInput || "0")
    if (!Number.isFinite(amount) || amount <= 0) return summary.remainingAmount
    return Math.max(summary.remainingAmount - amount, 0)
  }, [amountInput, summary.remainingAmount])

  const progressPercent = useMemo(() => {
    if (summary.totalTuition <= 0) return 0
    return Math.min((summary.amountPaid / summary.totalTuition) * 100, 100)
  }, [summary.amountPaid, summary.totalTuition])

  const submitPayment = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    const amount = Number(amountInput)
    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      const payment = await paymentsService.createPayment({ amount, paymentMethod: method, note })
      setLastPayment(payment)
      setSummary(await paymentsService.getSummary())
      setAmountInput("")
      setPhone("")
      setNote("")
      setMessage({ type: "success", text: "Paiement enregistre avec succes." })
    } catch (error) {
      let code = error instanceof Error ? error.message : "UNKNOWN"

      // Si on reçoit une erreur HTTP brute, on essaie d'extraire un code métier depuis le payload
      if (error instanceof ApiClientError) {
        const payload = error.payload as Record<string, unknown> | null
        const candidate =
          payload?.code ??
          payload?.errorCode ??
          payload?.type ??
          payload?.error ??
          payload?.message
        if (typeof candidate === "string") code = candidate
      }

      if (code === "AMOUNT_EXCEEDS_REMAINING") {
        setMessage({ type: "error", text: "Le montant depasse le reste a payer." })
      } else if (code === "INVALID_AMOUNT") {
        setMessage({ type: "error", text: "Entrez un montant valide." })
      } else {
        setMessage({ type: "error", text: "Paiement impossible pour le moment." })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const downloadReceipt = async () => {
    if (!lastPayment) return
    const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

    const methodLabel =
      lastPayment.paymentMethod === "orange_money"
        ? "Orange Money"
        : lastPayment.paymentMethod === "mtn_momo"
          ? "MTN Mobile Money"
          : "Especes"

    const paymentDate = sanitizeTextForPdf(
      new Date(lastPayment.paidAt ?? lastPayment.createdAt).toLocaleString("fr-FR")
    )
    const logoDataUrl = await fetch("/images/logo.png")
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
            reader.readAsDataURL(blob)
          })
      )
      .catch(() => "")

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const left = 16
    const right = pageWidth - 16

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageWidth, 42, "F")

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", left, 8, 34, 12)
    }

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text("Recu de paiement", left, 28)
    doc.setFontSize(11)
    doc.text(`Reference: ${lastPayment.paymentId}`, left, 35)

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)

    let y = 56
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

    row("Etudiant", summary.studentName)
    row("Classe", summary.className)
    row("Date", paymentDate)
    row("Mode de paiement", methodLabel)
    row("Montant verse", formatFcfaForPdf(lastPayment.amount))
    row("Total frais", formatFcfaForPdf(summary.totalTuition))
    row("Total deja paye", formatFcfaForPdf(summary.amountPaid))
    row("Reste a payer", formatFcfaForPdf(summary.remainingAmount))

    doc.setFillColor(248, 250, 252)
    doc.roundedRect(left, y + 6, right - left, 18, 2, 2, "F")
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(10)
    doc.text("Merci pour votre paiement. Ce recu est genere automatiquement par Glonetz.", left + 4, y + 17)

    doc.save(`recu-${lastPayment.paymentId}.pdf`)
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
            <p className="text-sm font-medium text-foreground">Traitement du paiement en cours...</p>
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
          <h1 className="text-xl font-bold md:text-2xl">Effectuer un paiement</h1>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Suivez votre progression de paiement et reglez votre scolarite en toute securite.
          </p>
          <p className="mt-2 text-sm text-primary-foreground/90">
          Classe: <span className="font-semibold">{summary.className}</span> - Frais totaux:{" "}
          <span className="font-semibold">{formatFcfa(summary.totalTuition)}</span>
          </p>
        </div>
        <div className="bg-black/10 px-5 py-3 md:px-6">
          <div className="flex items-center justify-between text-xs text-primary-foreground/90">
            <span>Progression de paiement</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total a payer</p>
            <p className="mt-1 text-xl font-bold">{formatFcfa(summary.totalTuition)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Deja paye</p>
            <p className="mt-1 text-xl font-bold text-primary">{formatFcfa(summary.amountPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Reste a payer</p>
            <p className="mt-1 text-xl font-bold text-destructive">{formatFcfa(summary.remainingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-primary/15 shadow-sm overflow-hidden">
          {submitting ? (
            <div className="h-1 w-full overflow-hidden bg-primary/10">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
          ) : null}
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              Nouveau paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Montant</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="Ex: 35000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  max={summary.remainingAmount}
                />
              </div>
              {/* <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                    <SelectItem value="cash">Especes</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone-number">Numero de paiement</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-note">Note (optionnel)</Label>
                <Input
                  id="payment-note"
                  placeholder="Ajouter une note pour ce paiement"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {message ? (
              <div
                className={
                  message.type === "success"
                    ? "rounded-xl border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
                    : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                }
              >
                {message.text}
              </div>
            ) : null}

            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
              <p className="text-muted-foreground">
                Reste apres ce paiement:{" "}
                <span className="font-semibold text-foreground">{formatFcfa(remainingAfterInput)}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="sm:min-w-44" onClick={submitPayment} disabled={summary.remainingAmount <= 0 || submitting}>
                {submitting ? "Soumission..." : "Valider le paiement"}
              </Button>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setAmountInput("")
                  setPhone("")
                  setNote("")
                  setMessage(null)
                }}
              >
                Reinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resultat du paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {message?.type === "success" ? (
                <div className="rounded-lg border border-green-500/25 bg-green-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                    <CircleCheck className="size-4" />
                    Paiement reussi
                  </div>
                  <p className="mt-1 text-muted-foreground">{message.text}</p>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Le statut de la transaction apparait ici apres soumission.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                Un recu PDF est disponible apres validation du paiement.
              </div>
              <Button variant="outline" className="w-full" onClick={downloadReceipt} disabled={!lastPayment}>
                <ReceiptText className="mr-2 size-4" />
                Telecharger le recu
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/15 shadow-sm">
            <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 text-primary" />
              Les paiements sont traites via des canaux securises.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
