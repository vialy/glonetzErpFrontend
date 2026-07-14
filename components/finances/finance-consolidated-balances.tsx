"use client"

import { Building2, Landmark, Layers3, RefreshCw, Users } from "lucide-react"
import { FinanceStatCard } from "@/components/finances/finance-premium-ui"
import { useFinanceConsolidatedBalances } from "@/hooks/use-finance-consolidated-balances"
import { useNeeroMerchantBalance } from "@/hooks/use-neero-merchant-balance"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatNeeroGap(gap: number, t: ReturnType<typeof useLocale>["t"]) {
  if (gap === 0) {
    return t("fin_balance_neero_gap").replace("{gap}", formatFcfa(0))
  }
  return t("fin_balance_neero_gap").replace("{gap}", `${gap > 0 ? "+" : ""}${formatFcfa(gap)}`)
}

export function FinanceConsolidatedBalances() {
  const { t } = useLocale()
  const balances = useFinanceConsolidatedBalances()
  const neero = useNeeroMerchantBalance()
  const showNeero = neero.apiMode

  if (balances.loading) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          showNeero ? "sm:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {Array.from({ length: showNeero ? 4 : 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-36" />
            <Skeleton className="mt-3 h-2 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const progressManagers =
    balances.withManagers > 0
      ? Math.round((balances.managersRemaining / balances.withManagers) * 100)
      : 0
  const progressVirtual =
    balances.totalConsolidated > 0
      ? Math.round((balances.virtualWalletsTotal / balances.totalConsolidated) * 100)
      : 0

  const neeroValue = (() => {
    if (neero.loading && !neero.data) return "…"
    if (neero.error) return "—"
    if (!neero.data?.available || neero.data.neeroBalance === null) return "—"
    return formatFcfa(neero.data.neeroBalance)
  })()

  const neeroHint = (() => {
    if (neero.loading && !neero.data) return t("fin_balance_neero_card_hint") + "…"
    if (neero.error) return t("fin_balance_neero_unavailable")
    if (!neero.data?.available || neero.data.neeroBalance === null) {
      return neero.data?.message ?? t("fin_balance_neero_unavailable")
    }
    if (neero.data.source === "simulated") return t("fin_balance_neero_simulated")
    if (neero.data.source === "ledger_only") {
      return t("fin_balance_neero_card_hint")
    }
    return formatNeeroGap(neero.data.gap ?? 0, t)
  })()

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        showNeero ? "sm:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      <FinanceStatCard
        featured
        accent="sky"
        label={t("fin_balance_company")}
        value={formatFcfa(balances.companyBalance)}
        hint={t("fin_balance_company_hint")}
        icon={<Building2 className="size-4" />}
        progress={100}
      />
      <FinanceStatCard
        featured
        accent="indigo"
        label={t("fin_balance_with_managers")}
        value={formatFcfa(balances.withManagers)}
        hint={t("fin_balance_with_managers_hint").replace(
          "{amount}",
          formatFcfa(balances.managersRemaining),
        )}
        icon={<Users className="size-4" />}
        progress={progressManagers}
        valueClassName="text-indigo-700 dark:text-indigo-300"
      />
      <FinanceStatCard
        featured
        accent="violet"
        label={t("fin_balance_total")}
        value={formatFcfa(balances.totalConsolidated)}
        hint={t("fin_balance_total_hint").replace("{amount}", formatFcfa(balances.virtualWalletsTotal))}
        icon={<Layers3 className="size-4" />}
        progress={progressVirtual}
        valueClassName="text-violet-700 dark:text-violet-300"
      />

      {showNeero ? (
        <div className="relative">
          <FinanceStatCard
            featured
            accent="amber"
            label={t("fin_balance_neero_card")}
            value={neeroValue}
            hint={neeroHint}
            icon={<Landmark className="size-4" />}
            valueClassName="text-amber-900 dark:text-amber-100"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-4 size-7 rounded-lg text-muted-foreground hover:text-foreground"
            disabled={neero.loading}
            aria-label={t("fin_balance_neero_refresh")}
            title={t("fin_balance_neero_refresh")}
            onClick={() => void neero.reload()}
          >
            <RefreshCw className={cn("size-3.5", neero.loading && "animate-spin")} />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
