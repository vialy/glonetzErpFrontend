"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { useLocale } from "@/hooks/use-locale"
import { useStaffMembersQuery } from "@/hooks/use-staff-members"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  CREATABLE_STAFF_ROLES,
  staffMembersService,
  type StaffMember,
  type StaffRole,
} from "@/domains/staff"
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

type Translate = (k: import("@/services/i18n").TranslationKey) => string

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim())
}

function roleLabel(role: StaffRole, t: Translate) {
  switch (role) {
    case "admin":
      return t("adm_usr_role_admin")
    case "manager":
      return t("adm_usr_role_manager")
    case "accountant":
      return t("adm_usr_role_accountant")
    case "support":
      return t("adm_usr_role_support")
    default:
      return role
  }
}

export default function AdminUsersPage() {
  const { t } = useLocale()
  const { members, loading, error, refresh } = useStaffMembersQuery()

  const [showCreate, setShowCreate] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<StaffRole>("manager")
  const [emailTouched, setEmailTouched] = useState(false)
  const [createTouched, setCreateTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null)
  const [resetting, setResetting] = useState(false)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  const emailDuplicate = useMemo(() => {
    if (!isValidEmail(email)) return false
    const key = email.trim().toLowerCase()
    return members.some((m) => m.email.trim().toLowerCase() === key)
  }, [email, members])

  const emailError = useMemo(() => {
    if (!(emailTouched || createTouched)) return null
    if (!email.trim()) return t("adm_usr_err_email_required")
    if (!isValidEmail(email)) return t("adm_usr_err_email_invalid")
    if (emailDuplicate) return t("adm_usr_err_email_dup")
    return null
  }, [email, emailTouched, createTouched, emailDuplicate, t])

  const canCreate = fullName.trim().length >= 2 && isValidEmail(email) && !emailDuplicate

  function resetCreateForm() {
    setFullName("")
    setEmail("")
    setRole("manager")
    setEmailTouched(false)
    setCreateTouched(false)
  }

  async function handleCreate() {
    setCreateTouched(true)
    setEmailTouched(true)
    if (!fullName.trim()) {
      toast({
        title: t("adm_usr_toast_missing"),
        description: t("adm_usr_toast_missing_desc"),
        variant: "destructive",
      })
      return
    }
    if (!canCreate) {
      toast({ title: emailError ?? t("adm_usr_err_email_invalid"), variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const created = await staffMembersService.create({ name: fullName, email, role })
      toast({
        title: t("adm_usr_toast_created"),
        description: t("adm_usr_toast_created_email")
          .replace("{name}", created.fullName)
          .replace("{role}", roleLabel(created.role, t))
          .replace("{email}", created.email),
      })
      resetCreateForm()
      setShowCreate(false)
      await refresh()
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      if (code === "EMAIL_ALREADY_USED") {
        toast({ title: t("adm_usr_err_email_dup"), variant: "destructive" })
      } else {
        toast({
          title: t("adm_usr_create_failed"),
          description: getApiErrorMessage(e, t("adm_usr_create_failed")),
          variant: "destructive",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(member: StaffMember, nextRole: StaffRole) {
    if (nextRole === member.role) return
    setUpdatingRoleId(member.id)
    try {
      await staffMembersService.update(member.id, { role: nextRole })
      toast({
        title: t("adm_usr_saved_ok"),
        description: t("adm_usr_toast_role_changed")
          .replace("{name}", member.fullName)
          .replace("{role}", roleLabel(nextRole, t)),
      })
      await refresh()
    } catch (e) {
      toast({
        title: t("adm_usr_err_save"),
        description: getApiErrorMessage(e, t("adm_usr_err_save")),
        variant: "destructive",
      })
    } finally {
      setUpdatingRoleId(null)
    }
  }

  async function handleRegeneratePassword() {
    if (!resetTarget) return
    setResetting(true)
    try {
      await staffMembersService.regeneratePassword(resetTarget.id)
      toast({
        title: t("adm_usr_toast_pin_ok"),
        description: t("adm_usr_regenerate_pwd_ok")
          .replace("{name}", resetTarget.fullName)
          .replace("{email}", resetTarget.email),
      })
    } catch (e) {
      toast({
        title: t("adm_usr_err_regenerate"),
        description: getApiErrorMessage(e, t("adm_usr_err_regenerate")),
        variant: "destructive",
      })
    } finally {
      setResetting(false)
      setResetTarget(null)
    }
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_usr_title")}
        subtitle={t("adm_usr_subtitle_staff")}
        gradientClassName="from-slate-700 to-slate-900"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("adm_usr_students_hint")}</p>
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
            <label className="block text-sm">
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
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">{t("adm_usr_th_role")}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {CREATABLE_STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium">
                {t("adm_usr_th_email")}
                <span className="text-destructive"> *</span>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
                  emailError ? "border-destructive" : ""
                }`}
                placeholder={t("adm_usr_ph_email_example")}
                autoComplete="email"
              />
              <span className="mt-1 block text-xs text-muted-foreground">{t("adm_usr_email_hint")}</span>
              {emailError ? (
                <span className="mt-1 block text-xs text-destructive">{emailError}</span>
              ) : null}
            </label>
          </div>
          <button
            type="button"
            disabled={saving || (createTouched && !canCreate)}
            onClick={handleCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t("adm_usr_save")}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("adm_usr_th_name")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_role")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_email")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_status")}</th>
                <th className="px-4 py-3">{t("adm_usr_th_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/admin/utilisateurs/${u.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {u.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      roleLabel(u.role, t)
                    ) : (
                      <select
                        value={u.role}
                        disabled={updatingRoleId === u.id}
                        onChange={(e) => void handleRoleChange(u, e.target.value as StaffRole)}
                        className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
                        aria-label={t("adm_usr_th_role")}
                      >
                        {CREATABLE_STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r, t)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
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
                      {u.role !== "admin" ? (
                        <button
                          type="button"
                          onClick={() => setResetTarget(u)}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          {t("adm_usr_regenerate_pwd")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("adm_usr_loading")}
          </div>
        ) : members.length === 0 && !error ? (
          <AdminEmptyState title={t("adm_usr_empty_title")} description={t("adm_usr_empty_desc")} />
        ) : null}
      </div>

      <AlertDialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adm_usr_regenerate_pwd_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? t("adm_usr_regenerate_pwd_named")
                    .replace("{name}", resetTarget.fullName)
                    .replace("{email}", resetTarget.email)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleRegeneratePassword()
              }}
              disabled={resetting}
            >
              {resetting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("adm_usr_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
