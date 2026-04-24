"use client"

import { PaymentsListPage } from "@/components/paiements/payments-list-page"
import { useAdminPayments } from "@/hooks/use-admin-payments"
import { useLocale } from "@/hooks/use-locale"

export default function AdminPaiementsPage() {
  const payments = useAdminPayments()
  const { t } = useLocale()
  return (
    <PaymentsListPage
      payments={payments}
      pageTitle={t("mgr_payments_title")}
      pageSubtitle={t("adm_payments_subtitle")}
      exportFilenamePrefix="paiements-admin"
      receiptPreviewLine={t("pay_list_recv_preview_admin")}
      pdfIssuerFooter={t("pay_list_pdf_footer_admin")}
    />
  )
}
