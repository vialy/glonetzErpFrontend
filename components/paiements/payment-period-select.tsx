"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PeriodPreset } from "@/lib/manager-period-range"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

/** Préréglages proposés dans le menu période (liste paiements). */
export const PAYMENT_PERIOD_PRESETS: PeriodPreset[] = [
  "all",
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "custom",
]

const PRESET_KEYS: Record<PeriodPreset, TranslationKey> = {
  all: "mgr_period_all",
  today: "mgr_period_today",
  yesterday: "mgr_period_yesterday",
  last_7: "mgr_period_last_7",
  last_30: "mgr_period_last_30",
  this_week: "mgr_period_this_week",
  last_week: "mgr_period_last_week",
  this_month: "mgr_period_this_month",
  last_month: "mgr_period_last_month",
  this_year: "mgr_period_this_year",
  last_year: "mgr_period_last_year",
  custom: "mgr_period_custom",
}

type PaymentPeriodSelectProps = {
  value: PeriodPreset
  onChange: (preset: PeriodPreset) => void
  className?: string
}

export function PaymentPeriodSelect({ value, onChange, className }: PaymentPeriodSelectProps) {
  const { t } = useLocale()

  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodPreset)}>
      <SelectTrigger
        className={cn(
          "h-11 w-full min-w-0 gap-2 rounded-xl border border-input bg-gradient-to-r from-background to-emerald-500/5 px-3 text-sm font-medium shadow-sm transition hover:border-emerald-500/40 focus:ring-emerald-500/20",
          className,
        )}
      >
        <SelectValue placeholder={t("pay_list_period_choose")} />
      </SelectTrigger>
      <SelectContent className="max-h-[min(70vh,320px)] rounded-xl border-border/80 shadow-lg">
        {PAYMENT_PERIOD_PRESETS.map((preset) => (
          <SelectItem
            key={preset}
            value={preset}
            className="cursor-pointer rounded-lg py-2.5 text-sm font-medium focus:bg-emerald-500/10 focus:text-emerald-900 dark:focus:text-emerald-100"
          >
            {t(PRESET_KEYS[preset])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function paymentPeriodLabel(preset: PeriodPreset, t: (key: TranslationKey) => string): string {
  return t(PRESET_KEYS[preset])
}
