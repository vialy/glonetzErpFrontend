"use client"

import { PaymentsListPage } from "@/components/paiements/payments-list-page"
import { useManagerPayments } from "@/hooks/use-manager-payments"
import { useLocale } from "@/hooks/use-locale"

const RECEIPT_PREVIEW =
  "Document emis depuis l'espace gestionnaire — apercu fidel au PDF exporte."
const PDF_FOOTER = "Document emis depuis l'espace gestionnaire Glonetz."

export default function ManagerPaiementsPage() {
  const payments = useManagerPayments()
  const { t } = useLocale()
  return (
    <PaymentsListPage
      payments={payments}
      pageTitle={t("mgr_payments_title")}
      pageSubtitle={t("mgr_payments_subtitle")}
      exportFilenamePrefix="paiements-manager"
      receiptPreviewLine={RECEIPT_PREVIEW}
      pdfIssuerFooter={PDF_FOOTER}
    />
  )
}
