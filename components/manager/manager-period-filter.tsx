"use client"

import { CalendarDays, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/hooks/use-locale"
import type { ManagerPeriodFilterValue, PeriodPreset } from "@/lib/manager-period-range"
import { defaultManagerPeriodFilter } from "@/lib/manager-period-range"
import { cn } from "@/lib/utils"
import type { TranslationKey } from "@/services/i18n"

const PRESET_ORDER: PeriodPreset[] = [
  "all",
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
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

type Props = {
  value: ManagerPeriodFilterValue
  onChange: (next: ManagerPeriodFilterValue) => void
  hint?: string
  className?: string
  summary?: React.ReactNode
}

/** Filtre période : préréglages (aujourd'hui, 7 jours, ce mois, etc.) + personnalisé (date début / fin). */
export function ManagerPeriodFilter({ value, onChange, hint, className, summary }: Props) {
  const { t } = useLocale()

  const isFiltered =
    value.preset !== "all" && !(value.preset === "custom" && (!value.customFrom.trim() || !value.customTo.trim()))

  function setPreset(preset: PeriodPreset) {
    if (preset === "custom") {
      onChange({ ...value, preset })
      return
    }
    onChange({ preset, customFrom: "", customTo: "" })
  }

  function reset() {
    onChange(defaultManagerPeriodFilter())
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {t("mgr_period_label")}
        </Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Select value={value.preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
            <SelectTrigger className="h-11 w-full rounded-xl border-input bg-background sm:min-w-[260px] sm:max-w-[340px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(PRESET_KEYS[p])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value.preset === "custom" ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-1.5 text-xs sm:max-w-[200px]">
                <span className="font-medium text-muted-foreground">{t("mgr_period_date_from")}</span>
                <input
                  type="date"
                  value={value.customFrom}
                  onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                />
              </label>
              <label className="grid flex-1 gap-1.5 text-xs sm:max-w-[200px]">
                <span className="font-medium text-muted-foreground">{t("mgr_period_date_to")}</span>
                <input
                  type="date"
                  value={value.customTo}
                  onChange={(e) => onChange({ ...value, customTo: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                />
              </label>
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={value.preset === "all"}
            onClick={reset}
            className="h-11 shrink-0 gap-2 rounded-xl"
          >
            <RotateCcw className="size-3.5" />
            {t("mgr_budget_filter_reset")}
          </Button>
        </div>
      </div>
      {summary ? (
        <p
          className={cn(
            "shrink-0 text-sm text-muted-foreground sm:pt-7 sm:text-right",
            isFiltered && "font-medium text-foreground",
          )}
        >
          {summary}
        </p>
      ) : null}
    </div>
  )
}
