"use client"

import { useCallback, useState } from "react"
import { PaymentsListPage } from "@/components/paiements/payments-list-page"
import { DataLoadError } from "@/components/data-load-error"
import { useAdminPaymentsQuery } from "@/hooks/use-admin-payments"
import { useLocale } from "@/hooks/use-locale"

export default function AdminPaiementsPage() {
  const { payments, loading, error, refresh } = useAdminPaymentsQuery()
  const { t } = useLocale()
  const [retrying, setRetrying] = useState(false)
  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await refresh()
    setRetrying(false)
  }, [refresh])

  if (error && payments.length === 0) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  return (
    <PaymentsListPage
      payments={payments}
      loading={loading}
      pageTitle={t("mgr_payments_title")}
      pageSubtitle={t("adm_payments_subtitle")}
      exportFilenamePrefix="paiements-admin"
      receiptPreviewLine={t("pay_list_recv_preview_admin")}
      pdfIssuerFooter={t("pay_list_pdf_footer_admin")}
    />
  )
}
