"use client"

import { useState } from "react"
import { Bell, Lock, Settings2 } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { toast } from "@/components/ui/use-toast"
import { useLocale } from "@/hooks/use-locale"

export default function AdminSettingsPage() {
  const { t } = useLocale()
  const [organization, setOrganization] = useState("Glonet")
  const [strongValidation, setStrongValidation] = useState(true)
  const [auditLogs, setAuditLogs] = useState(true)
  const [claimAlert, setClaimAlert] = useState(true)
  const [budgetAlert, setBudgetAlert] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_set_title")}
        subtitle={t("adm_set_subtitle")}
        gradientClassName="from-slate-600 to-indigo-700"
      />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <section className="rounded-xl border bg-card p-4">
          <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
            <Settings2 className="size-4" />
          </div>
          <h2 className="mt-3 text-sm font-semibold">{t("adm_set_general")}</h2>
          <label className="mt-2 block text-xs text-muted-foreground">{t("adm_set_org_name")}</label>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </section>
        <section className="rounded-xl border bg-card p-4">
          <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
            <Lock className="size-4" />
          </div>
          <h2 className="mt-3 text-sm font-semibold">{t("adm_set_security")}</h2>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input checked={strongValidation} onChange={(e) => setStrongValidation(e.target.checked)} type="checkbox" />{" "}
            {t("adm_set_strong")}
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input checked={auditLogs} onChange={(e) => setAuditLogs(e.target.checked)} type="checkbox" />{" "}
            {t("adm_set_audit_log")}
          </label>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
            <Bell className="size-4" />
          </div>
          <h2 className="mt-3 text-sm font-semibold">{t("adm_set_notif")}</h2>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input checked={claimAlert} onChange={(e) => setClaimAlert(e.target.checked)} type="checkbox" />{" "}
            {t("adm_set_claim_alert")}
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input checked={budgetAlert} onChange={(e) => setBudgetAlert(e.target.checked)} type="checkbox" />{" "}
            {t("adm_set_budget_alert")}
          </label>
        </section>
      </div>
      <div className="mt-4">
        <button
          onClick={() => {
            setSaved(true)
            toast({ title: t("adm_set_toast_ok"), description: t("adm_set_toast_desc") })
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t("adm_set_save")}
        </button>
      </div>
      {saved ? (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {t("adm_set_saved_banner")} {organization}, {strongValidation ? t("adm_set_on") : t("adm_set_off")}.
        </div>
      ) : null}
    </div>
  )
}
