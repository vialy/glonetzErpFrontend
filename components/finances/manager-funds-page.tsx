"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { FinancePremiumPanel, FinanceSectionTabs } from "@/components/finances/finance-premium-ui"
import { ManagerAllocationView } from "@/components/finances/manager-allocation-view"
import { RealManagerTransfers } from "@/components/finances/real-finance-sections"
import { MockManagerPaymentsPage } from "@/app/dashboard/admin/finances/paiements-managers/mock-manager-payments-page"
import { useLocale } from "@/hooks/use-locale"
import { isApiDataProvider } from "@/lib/data-provider"

type Tab = "allocate" | "history"

export function ManagerFundsPage() {
  const { t } = useLocale()
  const apiMode = isApiDataProvider()
  const searchParams = useSearchParams()
  const tab = useMemo<Tab>(() => {
    const raw = searchParams.get("tab")
    return raw === "history" ? "history" : "allocate"
  }, [searchParams])

  return (
    <div className="space-y-5">
      <FinanceSectionTabs
        tabs={[
          {
            href: "/dashboard/admin/finances/fonds-managers",
            label: t("fin_mgr_funds_tab_allocate"),
            active: tab === "allocate",
            accent: "indigo",
          },
          {
            href: "/dashboard/admin/finances/fonds-managers?tab=history",
            label: t("fin_mgr_funds_tab_history"),
            active: tab === "history",
            accent: "violet",
          },
        ]}
      />

      {tab === "allocate" ? (
        <FinancePremiumPanel
          title={t("fin_mgr_funds_allocate_title")}
          description={apiMode ? t("fin_mgr_funds_allocate_sub_api") : t("fin_mgr_funds_allocate_sub_mock")}
          accent="indigo"
        >
          <ManagerAllocationView embedded />
        </FinancePremiumPanel>
      ) : (
        <FinancePremiumPanel
          title={t("fin_mgr_funds_history_title")}
          description={apiMode ? t("fin_mgr_funds_history_sub_api") : t("fin_mgr_funds_history_sub_mock")}
          accent="violet"
        >
          {apiMode ? <RealManagerTransfers /> : <MockManagerPaymentsPage embedded />}
        </FinancePremiumPanel>
      )}
    </div>
  )
}
