import type { AdminPaymentItem } from "@/services/admin-mock.service"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"

function statusLabel(status: AdminPaymentItem["status"]): string {
  if (status === "success") return "Valide"
  if (status === "pending") return "En attente"
  return "Saisie manuelle"
}

function methodLabel(method: AdminPaymentItem["method"]): string {
  if (method === "Especes") return "Especes (guichet)"
  return method === "MTN" ? "MTN Mobile Money" : "Orange Money"
}

/**
 * PDF recu pour un paiement admin (jsPDF, Helvetica — pas d'accents exotiques dans les libelles critiques).
 */
export async function generateAdminPaymentReceiptPdf(
  p: AdminPaymentItem,
  options?: { issuerFooter?: string },
): Promise<Blob> {
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

  const ref = p.operatorReference ?? p.id
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 16
  const right = pageWidth - 16

  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, pageWidth, 42, "F")
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", left, 9, 28, 10)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text("Recu de paiement", left, 28)
  doc.setFontSize(11)
  doc.text(`Reference: ${sanitizeTextForPdf(ref)}`, left, 35)

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

  row("Apprenant", p.learnerName)
  row("Classe", p.className)
  row("Date", p.createdAt)
  row("Mode de paiement", methodLabel(p.method))
  row("Montant verse", formatFcfaForPdf(p.amount))
  row("Statut", statusLabel(p.status))
  row("ID transaction", p.id)
  if (p.operatorReference) row("Reference operateur", p.operatorReference)
  if (p.note) row("Note", p.note)
  if (p.learnerId) row("ID apprenant", p.learnerId)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    options?.issuerFooter ?? "Document emis depuis l'espace administrateur Glonetz.",
    left,
    280,
  )

  return doc.output("blob")
}

export function canDownloadAdminPaymentReceipt(p: AdminPaymentItem): boolean {
  return p.status === "success" || p.status === "manual"
}
