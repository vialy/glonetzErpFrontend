"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Check, ChevronDown, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/hooks/use-locale"
import type { ManagerPeriodFilterValue, PeriodPreset } from "@/lib/manager-period-range"
import { defaultManagerPeriodFilter } from "@/lib/manager-period-range"
import { cn } from "@/lib/utils"
import type { TranslationKey } from "@/services/i18n"
import type { DateRange } from "react-day-picker"

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
  compact?: boolean
}

/** Filtre période : préréglages (aujourd'hui, 7 jours, ce mois, etc.) + personnalisé (date début / fin). */
export function ManagerPeriodFilter({ value, onChange, hint, className, summary, compact = false }: Props) {
  const { t } = useLocale()
  const [customOpen, setCustomOpen] = useState(false)

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

  function parseYmd(value: string): Date | undefined {
    if (!value) return undefined
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return undefined
    return new Date(year, month - 1, day)
  }

  function toYmd(date: Date | undefined): string {
    if (!date) return ""
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  function formatCompactDate(value: string): string {
    const date = parseYmd(value)
    if (!date) return "dd/mm/yyyy"
    return date.toLocaleDateString("fr-FR")
  }

  const selectedRange = useMemo<DateRange | undefined>(
    () => ({
      from: parseYmd(value.customFrom),
      to: parseYmd(value.customTo),
    }),
    [value.customFrom, value.customTo]
  )

  const compactRangeLabel = `${formatCompactDate(value.customFrom)} - ${formatCompactDate(value.customTo)}`

  return (
    <div
      className={cn(
        compact
          ? "flex flex-col gap-2 rounded-xl border border-border/80 bg-background p-2"
          : "flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        {!compact ? (
          <>
            <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {t("mgr_period_label")}
            </Label>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </>
        ) : null}

        <div className={cn("flex flex-col gap-3", !compact && "sm:flex-row sm:flex-wrap sm:items-end")}>
          <Select value={value.preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
            <SelectTrigger
              className={cn(
                "h-11 w-full rounded-xl border-input bg-background",
                compact ? "sm:min-w-[220px] sm:max-w-[280px]" : "sm:min-w-[260px] sm:max-w-[340px]"
              )}
            >
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

          {value.preset === "custom" && compact ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "group inline-flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border px-3 text-sm font-medium shadow-sm transition-all",
                      "border-white/70 bg-white/95 text-slate-900 backdrop-blur-sm hover:bg-white",
                      customOpen && "border-primary/30 ring-2 ring-primary/10"
                    )}
                  >
                    <span className="flex min-w-0 items-center">
                      <span className="mr-2 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarDays className="size-4" />
                      </span>
                      <span className="truncate text-left">{compactRangeLabel}</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "ml-2 size-4 shrink-0 text-slate-500 transition-transform duration-200",
                        customOpen && "rotate-180"
                      )}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={10}
                  className="w-[min(94vw,335px)] rounded-[1.35rem] border-slate-200/80 bg-white p-2 shadow-2xl sm:w-[310px] sm:p-2.5"
                >
                  <div className="space-y-3">
                    <Calendar
                      mode="range"
                      selected={selectedRange}
                      onSelect={(range) => {
                        onChange({
                          ...value,
                          customFrom: toYmd(range?.from),
                          customTo: toYmd(range?.to ?? range?.from),
                        })
                      }}
                      numberOfMonths={1}
                      className="w-full rounded-2xl bg-background p-0 [--cell-size:--spacing(9.5)]"
                      classNames={{
                        root: "w-full",
                        months: "w-full",
                        month: "w-full",
                        month_caption: "flex h-10 w-full items-center justify-center px-10 text-base font-semibold",
                        nav: "flex items-center justify-between w-full absolute top-0 inset-x-0",
                        table: "w-full",
                        weekdays: "grid grid-cols-7 w-full",
                        weekday: "w-full text-center text-[13px] font-medium text-slate-500",
                        week: "grid grid-cols-7 w-full mt-1.5",
                        day: "w-full aspect-square",
                      }}
                    />
                    <div className="border-t border-slate-200 pt-2">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-start">
                      <label className="grid gap-1.5 text-xs sm:w-[125px]">
                        <span className="font-medium text-slate-500">Start date</span>
                        <input
                          type="date"
                          value={value.customFrom}
                          onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
                          className="h-8.5 w-full rounded-lg border border-slate-200 bg-background px-2 text-[12px] shadow-sm"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs sm:w-[125px]">
                        <span className="font-medium text-slate-500">End date</span>
                        <input
                          type="date"
                          value={value.customTo}
                          onChange={(e) => onChange({ ...value, customTo: e.target.value })}
                          className="h-8.5 w-full rounded-lg border border-slate-200 bg-background px-2 text-[12px] shadow-sm"
                        />
                      </label>
                      <Button
                        type="button"
                        size="icon"
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 sm:w-[32px]"
                        onClick={() => setCustomOpen(false)}
                      >
                        <Check className="size-4" />
                      </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreset("all")}
                className="h-11 shrink-0 rounded-xl border-white/70 bg-white/80 px-4 text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"
              >
                {t("fin_period_hide")}
              </Button>
            </div>
          ) : null}

          {value.preset === "custom" && !compact ? (
            <div
              className={cn(
                "w-full",
                "flex flex-col gap-2 sm:flex-row sm:items-end"
              )}
            >
              <label className={cn("grid min-w-0 gap-1.5 text-xs", !compact && "flex-1 sm:max-w-[200px]")}>
                <span className="font-medium text-muted-foreground">{t("mgr_period_date_from")}</span>
                <input
                  type="date"
                  value={value.customFrom}
                  onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
                  className="h-11 min-w-0 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                />
              </label>
              <label className={cn("grid min-w-0 gap-1.5 text-xs", !compact && "flex-1 sm:max-w-[200px]")}>
                <span className="font-medium text-muted-foreground">{t("mgr_period_date_to")}</span>
                <input
                  type="date"
                  value={value.customTo}
                  onChange={(e) => onChange({ ...value, customTo: e.target.value })}
                  className="h-11 min-w-0 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                />
              </label>
            </div>
          ) : null}

          {!compact ? (
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
          ) : null}
        </div>
      </div>
      {summary && !compact ? (
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
