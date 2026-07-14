"use client"

import { useState } from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { StaffPasswordChangeSuccessPanel } from "@/components/staff/staff-password-change-success-panel"
import { useStaffPasswordChangeRedirect } from "@/hooks/use-staff-password-change-redirect"
import { useLocale } from "@/hooks/use-locale"
import { authService } from "@/domains/auth"
import { isApiDataProvider } from "@/lib/data-provider"
import { getApiErrorMessage, isStaffPasswordStrong } from "@/lib/api-error"
import type { TranslationKey } from "@/services/i18n"

interface StaffPasswordChangeSectionProps {
  descriptionKey?: TranslationKey
  errorTitleKey?: TranslationKey
  className?: string
}

export function StaffPasswordChangeSection({
  descriptionKey = "staff_change_password_sub",
  errorTitleKey = "adm_set_pin_fail",
  className,
}: StaffPasswordChangeSectionProps) {
  const { t } = useLocale()
  const { successVisible, secondsLeft, startRedirectCountdown } = useStaffPasswordChangeRedirect()
  const isApi = isApiDataProvider()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const minLen = isApi ? 8 : 6
    if (currentPassword.length < minLen || newPassword.length < minLen || confirmPassword.length < minLen) {
      toast({
        title: isApi ? t("staff_password_policy") : t("staff_password_min"),
        variant: "destructive",
      })
      return
    }
    if (isApi && !isStaffPasswordStrong(newPassword)) {
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

    setSaving(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      startRedirectCountdown()
    } catch (error) {
      toast({
        title: t(errorTitleKey),
        description: getApiErrorMessage(error, t("staff_password_policy")),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={className}>
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <KeyRound className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("staff_change_password_title")}</h2>
          <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {successVisible ? (
          <StaffPasswordChangeSuccessPanel secondsLeft={secondsLeft} />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="staff-current-password">
                {t("staff_current_password")}
              </Label>
              <Input
                id="staff-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="staff-new-password">
                {t("staff_new_password")}
              </Label>
              <Input
                id="staff-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="staff-confirm-password">
                {t("staff_confirm_password")}
              </Label>
              <Input
                id="staff-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {isApi ? <p className="text-xs text-muted-foreground">{t("staff_password_policy")}</p> : null}
            <Button type="button" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("staff_change_password_button")}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
