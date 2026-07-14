"use client"

import {
  HandCoins,
  Receipt,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { FinancePanel } from "@/components/finances/finance-module-shell"
import { FinanceConsolidatedBalances } from "@/components/finances/finance-consolidated-balances"
import { FinancePremiumPanel, FinanceQuickLinkCard } from "@/components/finances/finance-premium-ui"
import { RealCompanyCashflow } from "@/components/finances/real-finance-sections"
import { useLocale } from "@/hooks/use-locale"
import { isApiDataProvider } from "@/lib/data-provider"
import type { TranslationKey } from "@/services/i18n"
import type { FinanceAccent } from "@/components/finances/finance-premium-ui"

const QUICK_LINKS: Array<{
  href: string
  titleKey: TranslationKey
  descKey: TranslationKey
  accent: FinanceAccent
  icon: typeof Wallet
}> = [
  {
    href: "/dashboard/admin/finances/comptes-tresorerie",
    titleKey: "fin_nav_treasury",
    descKey: "fin_overview_link_treasury",
    accent: "sky",
    icon: Wallet,
  },
  {
    href: "/dashboard/admin/finances/fonds-managers",
    titleKey: "fin_nav_mgr_funds",
    descKey: "fin_overview_link_mgr_funds",
    accent: "indigo",
    icon: HandCoins,
  },
  {
    href: "/dashboard/admin/finances/depenses-managers",
    titleKey: "fin_nav_mgr_expenses",
    descKey: "fin_overview_link_mgr_exp",
    accent: "fuchsia",
    icon: Receipt,
  },
  {
    href: "/dashboard/admin/finances/depenses-extraordinaires",
    titleKey: "fin_nav_extra",
    descKey: "fin_overview_link_extra",
    accent: "amber",
    icon: TrendingDown,
  },
]

export function FinanceOverviewPage() {
  const { t } = useLocale()
  const apiMode = isApiDataProvider()

  return (
    <div className="space-y-5">
      <FinancePremiumPanel
        title={t("fin_overview_balances_title")}
        description={t("fin_overview_balances_sub")}
        accent="violet"
      >
        <FinanceConsolidatedBalances />
      </FinancePremiumPanel>

      {apiMode ? (
        <FinancePremiumPanel
          title={t("fin_real_cashflow_title")}
          description={t("fin_real_section_sub")}
          accent="sky"
        >
          <RealCompanyCashflow />
        </FinancePremiumPanel>
      ) : null}

      <FinancePanel title={t("fin_overview_links_title")} description={t("fin_overview_links_sub")} accent="violet">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <FinanceQuickLinkCard
                key={link.href}
                href={link.href}
                title={t(link.titleKey)}
                description={t(link.descKey)}
                icon={Icon}
                accent={link.accent}
              />
            )
          })}
        </div>
      </FinancePanel>
    </div>
  )
}
