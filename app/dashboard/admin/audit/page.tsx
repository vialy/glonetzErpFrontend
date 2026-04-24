"use client"

import { ShieldCheck } from "lucide-react"
import { adminAudits } from "@/services/admin-mock.service"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { useLocale } from "@/hooks/use-locale"

export default function AdminAuditPage() {
  const { t } = useLocale()
  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_audit_title")}
        subtitle={t("adm_audit_subtitle")}
        gradientClassName="from-amber-500 to-orange-600"
      />
      <div className="mt-4 inline-flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald-600" /> {t("adm_audit_mock")}
      </div>
      <div className="mt-4 space-y-3">
        {adminAudits.map((log) => (
          <div key={log.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{log.action}</p>
              <span className="text-xs text-muted-foreground">{log.createdAt}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{log.actor}</span> - {log.target}
            </p>
          </div>
        ))}
        {adminAudits.length === 0 ? (
          <AdminEmptyState title={t("adm_audit_empty_title")} description={t("adm_audit_empty_desc")} />
        ) : null}
      </div>
    </div>
  )
}
