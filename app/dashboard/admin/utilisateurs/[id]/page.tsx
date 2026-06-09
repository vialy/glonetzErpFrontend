"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Ban, CheckCircle2, KeyRound, Pencil, Phone, Shield, User } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminUserPhoneField } from "@/components/admin/admin-user-phone-field"
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
import { MobileBackButton } from "@/components/mobile-back-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useAdminUsers } from "@/hooks/use-admin-users"
import { useLocale } from "@/hooks/use-locale"
import {
  resetAdminUserPin,
  setAdminUserStatus,
  updateAdminUser,
  type AdminUserItem,
} from "@/services/admin-mock.service"
import {
  adminUserPhoneToInputValue,
  canonicalAdminUserPhone,
  getAdminUserPhoneFieldError,
  isAdminUserPhoneValid,
} from "@/lib/admin-user-phone"

function roleLabel(role: AdminUserItem["role"], t: (k: import("@/services/i18n").TranslationKey) => string) {
  switch (role) {
    case "admin":
      return t("adm_usr_role_admin")
    case "manager":
      return t("adm_usr_role_manager")
    case "accountant":
      return t("adm_usr_role_accountant")
    case "student":
      return t("adm_usr_role_student")
    default:
      return role
  }
}

export default function AdminUserFichePage() {
  const { t } = useLocale()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const users = useAdminUsers()
  const user = useMemo(() => users.find((u) => u.id === id), [users, id])

  const [editOpen, setEditOpen] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<AdminUserItem["status"] | null>(null)

  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formRole, setFormRole] = useState<AdminUserItem["role"]>("student")
  const [formStatus, setFormStatus] = useState<AdminUserItem["status"]>("active")

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [editPhoneTouched, setEditPhoneTouched] = useState(false)
  const [editSubmitTouched, setEditSubmitTouched] = useState(false)

  const editPhoneDuplicate = useMemo(() => {
    if (!user || !isAdminUserPhoneValid(formPhone)) return false
    const key = canonicalAdminUserPhone(formPhone)
    return users.some((u) => u.id !== user.id && canonicalAdminUserPhone(u.phone) === key)
  }, [formPhone, user, users])

  const editPhoneError = getAdminUserPhoneFieldError(
    formPhone,
    editPhoneTouched || editSubmitTouched,
    {
      empty: t("adm_usr_err_phone_required"),
      invalid: t("adm_usr_err_phone_invalid"),
      duplicate: t("adm_usr_err_phone_dup"),
    },
    editPhoneDuplicate,
  )

  const canSaveEdit =
    formName.trim().length >= 2 && isAdminUserPhoneValid(formPhone) && !editPhoneDuplicate

  function openEdit() {
    if (!user) return
    setFormName(user.fullName)
    setFormPhone(adminUserPhoneToInputValue(user.phone))
    setFormRole(user.role)
    setFormStatus(user.status)
    setEditPhoneTouched(false)
    setEditSubmitTouched(false)
    setEditOpen(true)
    setBanner(null)
  }

  function saveEdit() {
    if (!user) return
    setEditSubmitTouched(true)
    setEditPhoneTouched(true)
    if (!canSaveEdit) {
      setBanner({
        type: "error",
        text: editPhoneError ?? t("adm_usr_toast_missing_desc"),
      })
      return
    }
    setSaving(true)
    try {
      updateAdminUser(user.id, {
        fullName: formName,
        phone: formPhone,
        role: formRole,
        status: formStatus,
      })
      setBanner({ type: "success", text: t("adm_usr_saved_ok") })
      setEditOpen(false)
    } catch (e) {
      const code = e instanceof Error ? e.message : ""
      if (code === "PHONE_ALREADY_USED") {
        setBanner({ type: "error", text: t("adm_usr_err_phone_dup") })
      } else if (code === "PHONE_INVALID_FORMAT") {
        setBanner({ type: "error", text: t("adm_usr_err_phone_invalid") })
      } else if (code === "NAME_REQUIRED" || code === "PHONE_REQUIRED") {
        setBanner({ type: "error", text: t("adm_usr_toast_missing_desc") })
      } else {
        setBanner({ type: "error", text: t("adm_usr_err_save") })
      }
    } finally {
      setSaving(false)
    }
  }

  function confirmPinReset() {
    if (!user) return
    try {
      const { pin, phone, fullName } = resetAdminUserPin(user.id)
      setBanner({
        type: "success",
        text: t("adm_usr_pin_reset_msg")
          .replace("{name}", fullName)
          .replace("{phone}", phone)
          .replace("{pin}", pin),
      })
      setPinDialogOpen(false)
    } catch {
      setBanner({ type: "error", text: t("adm_usr_err_pin") })
    }
  }

  function confirmStatusChange() {
    if (!user || !pendingStatus) return
    try {
      setAdminUserStatus(user.id, pendingStatus)
      setBanner({
        type: "success",
        text: pendingStatus === "active" ? t("adm_usr_activated") : t("adm_usr_deactivated"),
      })
    } catch {
      setBanner({ type: "error", text: t("adm_usr_err_status") })
    } finally {
      setStatusDialogOpen(false)
      setPendingStatus(null)
    }
  }

  if (!user) {
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

  return (
    <div className="px-4 pb-10 pt-4 md:px-6 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/admin/utilisateurs" />
      <AdminPageHeader
        title={user.fullName}
        subtitle={t("adm_usr_fiche_subtitle").replace("{id}", user.id)}
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
            <Button size="sm" variant="outline" onClick={() => setPinDialogOpen(true)}>
              <KeyRound className="mr-2 size-3.5" />
              {t("adm_usr_reset_pin")}
            </Button>
            {user.status === "active" ? (
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
            ) : (
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
            )}
          </div>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("adm_usr_th_name")}</dt>
            <dd className="font-medium">{user.fullName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("adm_usr_th_phone")}</dt>
            <dd className="font-mono">{user.phone}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("adm_usr_th_role")}</dt>
            <dd className="font-medium">{roleLabel(user.role, t)}</dd>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {user.status === "active" ? (
              <Badge className="bg-emerald-500/15 text-emerald-800">{t("adm_usr_status_active")}</Badge>
            ) : (
              <Badge variant="secondary">{t("adm_usr_status_inactive")}</Badge>
            )}
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
            <AdminUserPhoneField
              id="usr-edit-phone"
              value={formPhone}
              onChange={setFormPhone}
              label={t("adm_usr_th_phone")}
              hint={t("adm_usr_phone_hint")}
              placeholder={t("adm_usr_ph_phone_example")}
              searchPlaceholder={t("phone_country_search")}
              touched={editPhoneTouched || editSubmitTouched}
              errorMessage={editPhoneError}
              onBlur={() => setEditPhoneTouched(true)}
            />
            <div className="space-y-1.5">
              <Label>{t("adm_usr_th_role")}</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as AdminUserItem["role"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("adm_usr_role_admin")}</SelectItem>
                  <SelectItem value="manager">{t("adm_usr_role_manager")}</SelectItem>
                  <SelectItem value="accountant">{t("adm_usr_role_accountant")}</SelectItem>
                  <SelectItem value="student">{t("adm_usr_role_student")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("adm_usr_th_status")}</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as AdminUserItem["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("adm_usr_status_active")}</SelectItem>
                  <SelectItem value="inactive">{t("adm_usr_status_inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              {t("adm_usr_cancel")}
            </Button>
            <Button type="button" onClick={saveEdit} disabled={saving || (editSubmitTouched && !canSaveEdit)}>
              {saving ? t("acc_exporting") : t("adm_usr_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adm_usr_dialog_reset_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adm_usr_dialog_reset_named").replace("{name}", user.fullName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPinReset}>{t("adm_usr_confirm")}</AlertDialogAction>
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
                ? t("adm_usr_confirm_activate").replace("{name}", user.fullName)
                : t("adm_usr_confirm_deactivate").replace("{name}", user.fullName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adm_usr_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>{t("adm_usr_confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
