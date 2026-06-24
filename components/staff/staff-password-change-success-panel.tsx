"use client"

import { CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLocale } from "@/hooks/use-locale"

interface StaffPasswordChangeSuccessPanelProps {
  secondsLeft: number
  className?: string
}

export function StaffPasswordChangeSuccessPanel({
  secondsLeft,
  className,
}: StaffPasswordChangeSuccessPanelProps) {
  const { t } = useLocale()

  return (
    <Alert className={`border-primary/30 bg-primary/5 text-foreground ${className ?? ""}`}>
      <CheckCircle2 className="text-primary" />
      <AlertTitle className="text-foreground">{t("staff_password_change_success_title")}</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {t("staff_password_change_redirect").replace("{seconds}", String(secondsLeft))}
      </AlertDescription>
    </Alert>
  )
}
