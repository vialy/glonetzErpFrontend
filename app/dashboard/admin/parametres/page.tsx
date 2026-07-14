"use client"

import { useCallback, useEffect, useState } from "react"
import { CreditCard, KeyRound, Loader2, Mail, Plus, Settings2, Trash2, User } from "lucide-react"
import { FormSectionSkeleton } from "@/components/loading/data-skeletons"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { authService } from "@/domains/auth"
import { settingsService, type PaymentGatewayId, type StaffSettings } from "@/domains/settings"
import { isApiDataProvider } from "@/lib/data-provider"
import { getApiErrorMessage, isStaffPasswordStrong } from "@/lib/api-error"
import { isValidNotificationEmail } from "@/lib/email-validation"
import { StaffPasswordChangeSuccessPanel } from "@/components/staff/staff-password-change-success-panel"
import { useStaffPasswordChangeRedirect } from "@/hooks/use-staff-password-change-redirect"

const MOCK_GATEWAYS: PaymentGatewayId[] = ["monero", "tranzak", "neero", "none"]
const API_GATEWAYS: PaymentGatewayId[] = ["neero", "none"]

function roleLabel(role: string, t: (k: import("@/services/i18n").TranslationKey) => string) {
  if (role === "admin") return t("adm_usr_role_admin")
  if (role === "manager") return t("adm_usr_role_manager")
  if (role === "accountant") return t("adm_usr_role_accountant")
  if (role === "student") return t("adm_usr_role_student")
  return role
}

function gatewayLabel(
  gateway: PaymentGatewayId,
  t: (k: import("@/services/i18n").TranslationKey) => string,
) {
  if (gateway === "neero") return t("adm_set_gateway_neero")
  if (gateway === "none") return t("adm_set_gateway_none")
  if (gateway === "monero") return t("adm_set_gateway_monero")
  if (gateway === "tranzak") return t("adm_set_gateway_tranzak")
  return gateway
}

export default function AdminSettingsPage() {
  const { t } = useLocale()
  const { email, phone, role, fullName } = useAuth()
  const { successVisible, secondsLeft, startRedirectCountdown } = useStaffPasswordChangeRedirect()
  const gateways = isApiDataProvider() ? API_GATEWAYS : MOCK_GATEWAYS

  const [settings, setSettings] = useState<StaffSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayId>("monero")
  const [emails, setEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [savingPlatform, setSavingPlatform] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  const profileName = fullName ?? null

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const data = await settingsService.get()
      setSettings(data)
      setActiveGateway(data.activeGateway)
      setEmails([...data.notificationEmails])
    } catch {
      toast({ title: t("adm_set_load_err"), variant: "destructive" })
    } finally {
      setSettingsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  function addNotificationEmail() {
    const value = newEmail.trim().toLowerCase()
    if (!value) return
    if (!isValidNotificationEmail(value)) {
      toast({ title: t("adm_set_email_invalid"), variant: "destructive" })
      return
    }
    if (emails.includes(value)) {
      toast({ title: t("adm_set_email_dup"), variant: "destructive" })
      return
    }
    setEmails((prev) => [...prev, value])
    setNewEmail("")
  }

  async function savePlatformSettings() {
    setSavingPlatform(true)
    try {
      const updated = await settingsService.update({
        activeGateway,
        notificationEmails: emails,
      })
      setSettings(updated)
      toast({
        title: t("adm_set_toast_ok"),
        description: t("adm_set_platform_saved"),
      })
    } catch {
      toast({ title: t("adm_set_save_err"), variant: "destructive" })
    } finally {
      setSavingPlatform(false)
    }
  }

  async function savePassword() {
    const minLen = isApiDataProvider() ? 8 : 6
    if (currentPassword.length < minLen || newPassword.length < minLen || confirmPassword.length < minLen) {
      toast({
        title: isApiDataProvider() ? t("staff_password_policy") : t("staff_password_min"),
        variant: "destructive",
      })
      return
    }
    if (isApiDataProvider() && !isStaffPasswordStrong(newPassword)) {
      toast({ title: t("staff_password_policy"), variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("staff_password_mismatch"), variant: "destructive" })
      return
    }
    if (currentPassword === newPassword) {
      toast({ title: t("staff_password_same"), variant: "destructive" })
      return
    }
    setSavingPassword(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      startRedirectCountdown()
    } catch (error) {
      toast({
        title: t("adm_set_pin_fail"),
        description: getApiErrorMessage(error, t("staff_password_policy")),
        variant: "destructive",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_set_title")}
        subtitle={t("adm_set_subtitle")}
        gradientClassName="from-slate-600 to-indigo-700"
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mon compte */}
        <section className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <User className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{t("adm_set_account_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("adm_set_account_desc")}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t("adm_set_profile_name")}</dt>
              <dd className="font-medium">{profileName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("staff_email_label")}</dt>
              <dd className="font-medium">{email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("phone_label")}</dt>
              <dd className="font-mono text-xs">{phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("adm_usr_th_role")}</dt>
              <dd className="font-medium">{role ? roleLabel(role, t) : "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Changement mot de passe */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <KeyRound className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{t("staff_change_password_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("adm_set_pin_desc")}</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {successVisible ? (
              <StaffPasswordChangeSuccessPanel secondsLeft={secondsLeft} />
            ) : (
              <>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("staff_current_password")}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("staff_new_password")}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("staff_confirm_password")}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {isApiDataProvider() ? (
              <p className="text-xs text-muted-foreground">{t("staff_password_policy")}</p>
            ) : null}
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={savingPassword}
              onClick={() => void savePassword()}
            >
              {savingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("staff_change_password_button")}
            </Button>
              </>
            )}
          </div>
        </section>

        {/* Parametres plateforme (API) */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Settings2 className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{t("adm_set_platform_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("adm_set_platform_desc")}</p>
            </div>
          </div>

          {settingsLoading ? (
            <div className="mt-4">
              <FormSectionSkeleton />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <CreditCard className="size-3.5" />
                  {t("adm_set_gateway")}
                </Label>
                <Select
                  value={activeGateway}
                  onValueChange={(v) => setActiveGateway(v as PaymentGatewayId)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gateways.map((g) => (
                      <SelectItem key={g} value={g}>
                        {gatewayLabel(g, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("adm_set_gateway_hint")}</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Mail className="size-3.5" />
                  {t("adm_set_emails")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {emails.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("adm_set_emails_empty")}</p>
                  ) : (
                    emails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs"
                      >
                        {email}
                        <button
                          type="button"
                          aria-label={t("adm_set_email_remove")}
                          className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setEmails((prev) => prev.filter((e) => e !== email))}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ops@glonez.local"
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addNotificationEmail()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={addNotificationEmail}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("adm_set_emails_hint")}</p>
              </div>

              <Button
                type="button"
                disabled={savingPlatform}
                onClick={() => void savePlatformSettings()}
              >
                {savingPlatform ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t("adm_set_save_platform")}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
