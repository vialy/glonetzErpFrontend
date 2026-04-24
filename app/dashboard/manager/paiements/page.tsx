"use client"

import { PaymentsListPage } from "@/components/paiements/payments-list-page"
import { useManagerPayments } from "@/hooks/use-manager-payments"
import { useLocale } from "@/hooks/use-locale"

export default function ManagerPaiementsPage() {
  const payments = useManagerPayments()
  const { t } = useLocale()
  return (
    <PaymentsListPage
      payments={payments}
      pageTitle={t("mgr_payments_title")}
      pageSubtitle={t("mgr_payments_subtitle")}
      exportFilenamePrefix="paiements-manager"
      receiptPreviewLine={t("pay_list_recv_preview_mgr")}
      pdfIssuerFooter={t("pay_list_pdf_footer_mgr")}
    />
  )
}
