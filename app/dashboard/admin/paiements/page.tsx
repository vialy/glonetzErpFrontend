"use client"

import { PaymentsListPage } from "@/components/paiements/payments-list-page"
import { useAdminPayments } from "@/hooks/use-admin-payments"

const RECEIPT_PREVIEW =
  "Document emis depuis l'espace administrateur — apercu fidel au PDF exporte."
const PDF_FOOTER = "Document emis depuis l'espace administrateur Glonetz."

export default function AdminPaiementsPage() {
  const payments = useAdminPayments()
  return (
    <PaymentsListPage
      payments={payments}
      pageTitle="Paiements apprenants"
      pageSubtitle="Encaissements declares, references operateur, validation des lignes en attente et export."
      exportFilenamePrefix="paiements-admin"
      receiptPreviewLine={RECEIPT_PREVIEW}
      pdfIssuerFooter={PDF_FOOTER}
    />
  )
}
