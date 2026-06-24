"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Shield,
  User,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MobileBackButton } from "@/components/mobile-back-button"
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
import { useLocale } from "@/hooks/use-locale"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  CREATABLE_STAFF_ROLES,
  staffMembersService,
  type StaffMember,
  type StaffRole,
} from "@/domains/staff"

type Translate = (k: import("@/services/i18n").TranslationKey) => string

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

export default function AdminUserFichePage() {
  const { t } = useLocale()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [member, setMember] = useState<StaffMember | null>(null)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<StaffMember["status"] | null>(null)

  const [formName, setFormName] = useState("")
  const [formRole, setFormRole] = useState<StaffRole>("manager")
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setMember(await staffMembersService.get(id))
    } catch {
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
    const onUpdate = () => void load()
    window.addEventListener("admin-staff-updated", onUpdate)
    return () => window.removeEventListener("admin-staff-updated", onUpdate)
  }, [load])

  const canSaveEdit = useMemo(() => formName.trim().length >= 2, [formName])

  function openEdit() {
    if (!member) return
    setFormName(member.fullName)
    setFormRole(member.role === "admin" ? "manager" : member.role)
    setEditOpen(true)
    setBanner(null)
  }

  async function saveEdit() {
    if (!member || !canSaveEdit) return
    setSaving(true)
    try {
      const roleChanged = member.role !== "admin" && formRole !== member.role
      const updated = await staffMembersService.update(member.id, {
        name: formName,
        ...(roleChanged ? { role: formRole } : {}),
      })
      if (updated) setMember(updated)
      setBanner({ type: "success", text: t("adm_usr_saved_ok") })
      setEditOpen(false)
    } catch (e) {
      setBanner({ type: "error", text: getApiErrorMessage(e, t("adm_usr_err_save")) })
    } finally {
      setSaving(false)
    }
  }

  async function confirmPasswordReset() {
    if (!member) return
    setBusy(true)
    try {
      await staffMembersService.regeneratePassword(member.id)
      setBanner({
        type: "success",
        text: t("adm_usr_regenerate_pwd_ok")
          .replace("{name}", member.fullName)
          .replace("{email}", member.email),
      })
      setPwdDialogOpen(false)
    } catch (e) {
      setBanner({ type: "error", text: getApiErrorMessage(e, t("adm_usr_err_regenerate")) })
    } finally {
      setBusy(false)
    }
  }

  async function confirmStatusChange() {
    if (!member || !pendingStatus) return
    setBusy(true)
    try {
      const updated = await staffMembersService.setActive(member.id, pendingStatus === "active")
      if (updated) setMember(updated)
      setBanner({
        type: "success",
        text: pendingStatus === "active" ? t("adm_usr_activated") : t("adm_usr_deactivated"),
      })
    } catch (e) {
      setBanner({ type: "error", text: getApiErrorMessage(e, t("adm_usr_err_status")) })
    } finally {
      setBusy(false)
      setStatusDialogOpen(false)
      setPendingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("adm_usr_loading")}
      </div>
    )
  }

  if (!member) {
    return (
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/admin/utilisateurs" />
        <p className="mt-4 text-muted-foreground">{t("adm_usr_not_found")}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/admin/utilisateurs">{t("adm_usr_back_list")}</Link>
        </Button>
      </div>
    )
  }

  const isAdmin = member.role === "admin"

  return (
    <div className="px-4 pb-10 pt-4 md:px-6 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/admin/utilisateurs" />
      <AdminPageHeader
        title={member.fullName}
        subtitle={t("adm_usr_fiche_subtitle").replace("{id}", member.id)}
        gradientClassName="from-slate-700 to-slate-900"
        actions={
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-primary-foreground/40 bg-white/10 text-primary-foreground hover:bg-white/20"
          >
            <Link href="/dashboard/admin/utilisateurs">
              <ArrowLeft className="mr-2 size-4" />
              {t("adm_usr_back_list")}
            </Link>
          </Button>
        }
      />

      {banner ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="mt-6 max-w-2xl rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("adm_usr_section_identity")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 size-3.5" />
              {t("adm_usr_edit")}
            </Button>
            {!isAdmin ? (
              <Button size="sm" variant="outline" onClick={() => setPwdDialogOpen(true)}>
                <KeyRound className="mr-2 size-3.5" />
                {t("adm_usr_regenerate_pwd")}
              </Button>
            ) : null}
            {!isAdmin && member.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setPendingStatus("inactive")
                  setStatusDialogOpen(true)
                }}
              >
                <Ban className="mr-2 size-3.5" />
                {t("adm_usr_deactivate_btn")}
              </Button>
            ) : null}
            {!isAdmin && member.status === "inactive" ? (
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-600/50 text-emerald-800"
                onClick={() => {
                  setPendingStatus("active")
                  setStatusDialogOpen(true)
                }}
              >
                <CheckCircle2 className="mr-2 size-3.5" />
                {t("adm_usr_activate_btn")}
              </Button>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("adm_usr_th_name")}</dt>
            <dd className="font-medium">{member.fullName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("adm_usr_th_email")}</dt>
            <dd className="font-mono">{member.email}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("adm_usr_th_role")}</dt>
            <dd className="font-medium">{roleLabel(member.role, t)}</dd>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {member.status === "active" ? (
              <Badge className="bg-emerald-500/15 text-emerald-800">{t("adm_usr_status_active")}</Badge>
            ) : (
              <Badge variant="secondary">{t("adm_usr_status_inactive")}</Badge>
            )}
            {member.mustChangePassword ? (
              <Badge variant="outline">{t("adm_usr_must_change_pwd")}</Badge>
            ) : null}
          </div>
        </dl>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adm_usr_edit_dialog_title")}</DialogTitle>
            <DialogDescription>{t("adm_usr_edit_dialog_desc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="usr-edit-name">{t("adm_usr_ph_name")}</Label>
              <Input id="usr-edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usr-edit-email">{t("adm_usr_th_email")}</Label>
              <Input id="usr-edit-email" value={member.email} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>{t("adm_usr_th_role")}</Label>
              {isAdmin ? (
                <Input value={roleLabel(member.role, t)} disabled readOnly />
              ) : (
                <Select value={formRole} onValueChange={(v) => setFormRole(v as StaffRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATABLE_STAFF_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              {t("adm_usr_cancel")}
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={saving || !canSaveEdit}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("adm_usr_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adm_usr_regenerate_pwd_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adm_usr_regenerate_pwd_named")
                .replace("{name}", member.fullName)
                .replace("{email}", member.email)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmPasswordReset()
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("adm_usr_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === "active" ? t("adm_usr_activate_btn") : t("adm_usr_deactivate_btn")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "active"
                ? t("adm_usr_confirm_activate").replace("{name}", member.fullName)
                : t("adm_usr_confirm_deactivate").replace("{name}", member.fullName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmStatusChange()
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("adm_usr_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
