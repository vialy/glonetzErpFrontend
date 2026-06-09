"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CreditCard, KeyRound, Loader2, Mail, Plus, Settings2, Trash2, User } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
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
import { canonicalAdminUserPhone } from "@/lib/admin-user-phone"
import { isValidNotificationEmail } from "@/lib/email-validation"
import { getAdminUsers } from "@/services/admin-mock.service"

const GATEWAYS: PaymentGatewayId[] = ["monero", "tranzak", "neero"]

const pinSlotClass =
  "size-11 rounded-xl border-2 border-border bg-background text-lg font-semibold shadow-sm transition-all data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20 sm:size-12"

function roleLabel(role: string, t: (k: import("@/services/i18n").TranslationKey) => string) {
  if (role === "admin") return t("adm_usr_role_admin")
  if (role === "manager") return t("adm_usr_role_manager")
  if (role === "accountant") return t("adm_usr_role_accountant")
  if (role === "student") return t("adm_usr_role_student")
  return role
}

export default function AdminSettingsPage() {
  const { t } = useLocale()
  const { phone, role } = useAuth()

  const [settings, setSettings] = useState<StaffSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayId>("monero")
  const [emails, setEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [savingPlatform, setSavingPlatform] = useState(false)

  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [savingPin, setSavingPin] = useState(false)

  const profileName = useMemo(() => {
    if (!phone) return null
    const key = canonicalAdminUserPhone(phone)
    const match = getAdminUsers().find((u) => canonicalAdminUserPhone(u.phone) === key)
    return match?.fullName ?? null
  }, [phone])

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

  async function savePin() {
    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      toast({ title: t("adm_set_pin_len"), variant: "destructive" })
      return
    }
    if (newPin !== confirmPin) {
      toast({ title: t("adm_set_pin_mismatch"), variant: "destructive" })
      return
    }
    if (currentPin === newPin) {
      toast({ title: t("adm_set_pin_same"), variant: "destructive" })
      return
    }
    setSavingPin(true)
    try {
      await authService.changePin(currentPin, newPin)
      setCurrentPin("")
      setNewPin("")
      setConfirmPin("")
      toast({
        title: t("adm_set_pin_ok"),
        description: t("adm_set_pin_ok_desc"),
      })
    } catch {
      toast({ title: t("adm_set_pin_fail"), variant: "destructive" })
    } finally {
      setSavingPin(false)
    }
  }

  const apiMode = (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api"

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title={t("adm_set_title")}
        subtitle={t("adm_set_subtitle")}
        gradientClassName="from-slate-600 to-indigo-700"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {apiMode ? "API" : "Mock"} · GET/PATCH /api/staff/settings
        </Badge>
        <Badge variant="outline" className="text-xs">
          POST /api/auth/change-pin
        </Badge>
      </div>

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
              <dt className="text-muted-foreground">{t("phone_label")}</dt>
              <dd className="font-mono text-xs">{phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("adm_usr_th_role")}</dt>
              <dd className="font-medium">{role ? roleLabel(role, t) : "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Changement PIN */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <KeyRound className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{t("adm_set_pin_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("adm_set_pin_desc")}</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("current_pin")}</Label>
              <div className="flex justify-start">
                <InputOTP maxLength={4} value={currentPin} onChange={setCurrentPin}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className={pinSlotClass} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("new_pin")}</Label>
              <div className="flex justify-start">
                <InputOTP maxLength={4} value={newPin} onChange={setNewPin}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className={pinSlotClass} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("confirm_pin")}</Label>
              <div className="flex justify-start">
                <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className={`${pinSlotClass} ${
                          confirmPin.length === 4 && confirmPin !== newPin
                            ? "border-destructive"
                            : confirmPin.length === 4 && confirmPin === newPin
                              ? "border-emerald-500"
                              : ""
                        }`}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={savingPin}
              onClick={() => void savePin()}
            >
              {savingPin ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("adm_set_pin_save")}
            </Button>
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
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("adm_set_loading")}
            </p>
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
                    {GATEWAYS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
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

              {settings ? (
                <p className="text-[10px] text-muted-foreground">
                  ID {settings.id} · {t("adm_set_updated")}{" "}
                  {new Date(settings.updatedAt).toLocaleString("fr-FR")}
                </p>
              ) : null}

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
