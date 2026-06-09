"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { UserPlus } from "lucide-react"
import { createAdminUser, resetAdminUserPin, type AdminUserItem } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminUserPhoneField } from "@/components/admin/admin-user-phone-field"
import { useLocale } from "@/hooks/use-locale"
import { useAdminUsers } from "@/hooks/use-admin-users"
import {
  canonicalAdminUserPhone,
  getAdminUserPhoneFieldError,
  isAdminUserPhoneValid,
} from "@/lib/admin-user-phone"
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

function roleLabel(role: AdminUserItem["role"]) {
  switch (role) {
    case "admin":
      return "Admin"
    case "manager":
      return "Manager"
    case "accountant":
      return "Comptable"
    case "student":
      return "Apprenant"
    default:
      return role
  }
}

function mapUserPhoneError(code: string, t: (k: import("@/services/i18n").TranslationKey) => string) {
  if (code === "PHONE_ALREADY_USED") return t("adm_usr_err_phone_dup")
  if (code === "PHONE_INVALID_FORMAT") return t("adm_usr_err_phone_invalid")
  if (code === "PHONE_REQUIRED") return t("adm_usr_err_phone_required")
  return t("adm_usr_toast_missing_desc")
}

export default function AdminUsersPage() {
  const { t } = useLocale()
  const users = useAdminUsers()
  const [showCreate, setShowCreate] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<AdminUserItem["role"]>("student")
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [createTouched, setCreateTouched] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null)

  const phoneDuplicate = useMemo(() => {
    if (!isAdminUserPhoneValid(phone)) return false
    const key = canonicalAdminUserPhone(phone)
    return users.some((u) => canonicalAdminUserPhone(u.phone) === key)
  }, [phone, users])

  const phoneError = getAdminUserPhoneFieldError(
    phone,
    phoneTouched || createTouched,
    {
      empty: t("adm_usr_err_phone_required"),
      invalid: t("adm_usr_err_phone_invalid"),
      duplicate: t("adm_usr_err_phone_dup"),
    },
    phoneDuplicate,
  )

  const canCreate =
    fullName.trim().length >= 2 && isAdminUserPhoneValid(phone) && !phoneDuplicate

  function resetCreateForm() {
    setFullName("")
    setPhone("")
    setRole("student")
    setPhoneTouched(false)
    setCreateTouched(false)
  }

  function handleCreate() {
    setCreateTouched(true)
    setPhoneTouched(true)
    if (!fullName.trim()) {
      toast({
        title: t("adm_usr_toast_missing"),
        description: t("adm_usr_toast_missing_desc"),
        variant: "destructive",
      })
      return
    }
    if (!canCreate) {
      toast({
        title: phoneError ?? t("adm_usr_err_phone_invalid"),
        variant: "destructive",
      })
      return
    }
    try {
      const created = createAdminUser({ fullName, phone, role })
      toast({
        title: t("adm_usr_toast_created"),
        description: `${created.fullName} (${roleLabel(created.role)})`,
      })
      resetCreateForm()
      setShowCreate(false)
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      toast({
        title: t("adm_usr_toast_missing"),
        description: mapUserPhoneError(code, t),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_usr_title")}
        subtitle={t("adm_usr_subtitle")}
        gradientClassName="from-slate-700 to-slate-900"
      />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v)
            if (showCreate) resetCreateForm()
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <UserPlus className="size-3.5" /> {t("adm_usr_add_btn")}
        </button>
      </div>
      {showCreate ? (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">{t("adm_usr_new_title")}</p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-1">
              <span className="mb-1.5 block font-medium">
                {t("adm_usr_ph_name")}
                <span className="text-destructive"> *</span>
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setCreateTouched(true)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder={t("adm_usr_ph_name")}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm md:col-span-1">
              <span className="mb-1.5 block font-medium">{t("adm_usr_th_role")}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUserItem["role"])}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="admin">{t("adm_usr_role_admin")}</option>
                <option value="manager">{t("adm_usr_role_manager")}</option>
                <option value="accountant">{t("adm_usr_role_accountant")}</option>
                <option value="student">{t("adm_usr_role_student")}</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <AdminUserPhoneField
                id="create-user-phone"
                value={phone}
                onChange={setPhone}
                label={t("adm_usr_th_phone")}
                hint={t("adm_usr_phone_hint")}
                placeholder={t("adm_usr_ph_phone_example")}
                searchPlaceholder={t("phone_country_search")}
                touched={phoneTouched || createTouched}
                errorMessage={phoneError}
                onBlur={() => setPhoneTouched(true)}
              />
            </div>
          </div>
          <button
            type="button"
            disabled={createTouched && !canCreate}
            onClick={handleCreate}
            className="mt-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/admin/utilisateurs/${u.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {u.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{roleLabel(u.role)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                    >
                      {u.status === "active" ? t("adm_usr_status_active") : t("adm_usr_status_inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/admin/utilisateurs/${u.id}`}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted/50"
                      >
                        {t("adm_usr_edit")}
                      </Link>
                      <button
                        type="button"
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
        {users.length === 0 ? (
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
                try {
                  const { pin, phone: resetPhone, fullName: resetName } = resetAdminUserPin(resetTarget.id)
                  toast({
                    title: t("adm_usr_toast_pin_ok"),
                    description: t("adm_usr_pin_reset_msg")
                      .replace("{name}", resetName)
                      .replace("{phone}", resetPhone)
                      .replace("{pin}", pin),
                  })
                } catch {
                  toast({ title: t("adm_usr_err_pin"), variant: "destructive" })
                }
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
