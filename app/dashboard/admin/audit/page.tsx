"use client"

import { ShieldCheck } from "lucide-react"
import { adminAudits } from "@/services/admin-mock.service"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"

export default function AdminAuditPage() {
  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader title="Journal d'audit" subtitle="Tracabilite des actions critiques sur la plateforme." gradientClassName="from-amber-500 to-orange-600" />
      <div className="mt-4 rounded-xl border bg-card p-4 text-sm text-muted-foreground inline-flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" /> Les actions ci-dessous sont simulées (mock).</div>
      <div className="mt-4 space-y-3">
        {adminAudits.map((log) => (
          <div key={log.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{log.action}</p>
              <span className="text-xs text-muted-foreground">{log.createdAt}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">{log.actor}</span> - {log.target}</p>
          </div>
        ))}
        {adminAudits.length === 0 ? (
          <AdminEmptyState title="Aucun evenement d'audit" description="Les actions critiques apparaitront ici." />
        ) : null}
      </div>
    </div>
  )
}

