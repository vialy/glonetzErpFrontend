"use client"

import { useState } from "react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CertificateSignatureDialog } from "@/components/admin/certificate-signature-dialog"
import { StampAssetDialog } from "@/components/admin/stamp-asset-dialog"
import { StampDocumentEditor } from "@/components/admin/stamp-document-editor"
import { useLocale } from "@/hooks/use-locale"

export default function AdminStampsPage() {
  const { t } = useLocale()
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [stampOpen, setStampOpen] = useState(false)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        title={t("stamp_page_title")}
        subtitle={t("stamp_page_subtitle")}
        gradientClassName="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
      />

      <StampDocumentEditor
        onManageSignature={() => setSignatureOpen(true)}
        onManageStamp={() => setStampOpen(true)}
      />

      <CertificateSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
      <StampAssetDialog open={stampOpen} onOpenChange={setStampOpen} />
    </div>
  )
}
