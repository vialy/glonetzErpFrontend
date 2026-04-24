"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { adminUsers, type AdminUserItem } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { useLocale } from "@/hooks/use-locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminUsersPage() {
  const { t } = useLocale()
  const [showCreate, setShowCreate] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("student")
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null)

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_usr_title")}
        subtitle={t("adm_usr_subtitle")}
        gradientClassName="from-slate-700 to-slate-900"
      />
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <UserPlus className="size-3.5" /> {t("adm_usr_add_btn")}
        </button>
      </div>
      {showCreate ? (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">{t("adm_usr_new_title")}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder={t("adm_usr_ph_name")}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder={t("adm_usr_ph_phone")}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="accountant">accountant</option>
              <option value="student">student</option>
            </select>
          </div>
          <button
            onClick={() => {
              if (!fullName || !phone) {
                toast({
                  title: t("adm_usr_toast_missing"),
                  description: t("adm_usr_toast_missing_desc"),
                  variant: "destructive",
                })
                return
              }
              toast({
                title: t("adm_usr_toast_created"),
                description: `${fullName} (${role}) ${t("adm_usr_toast_created_desc")}`,
              })
              setFullName("")
              setPhone("")
              setRole("student")
            }}
            className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {t("adm_usr_save")}
          </button>
        </div>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("adm_usr_th_name")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_role")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_phone")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_status")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          toast({
                            title: t("adm_usr_toast_edit"),
                            description: t("adm_usr_edit_detail").replace("{name}", u.fullName),
                          })
                        }
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        {t("adm_usr_edit")}
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        {t("adm_usr_reset_pin")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {adminUsers.length === 0 ? (
          <AdminEmptyState title={t("adm_usr_empty_title")} description={t("adm_usr_empty_desc")} />
        ) : null}
      </div>
      <AlertDialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adm_usr_dialog_reset_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? t("adm_usr_dialog_reset_named").replace("{name}", resetTarget.fullName)
                : t("adm_usr_dialog_reset_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!resetTarget) return
                toast({
                  title: t("adm_usr_toast_pin_ok"),
                  description: `${t("adm_usr_toast_pin_desc")} ${resetTarget.fullName} ${t("adm_usr_toast_pin_sim")}`,
                })
                setResetTarget(null)
              }}
            >
              {t("adm_usr_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
