"use client"

import { useState } from "react"
import { HandCoins } from "lucide-react"
import { formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"

export default function ManagerAllocationPage() {
  const { t } = useLocale()
  const { wallets, managers, requestManagerTransfer } = useFinanceContext()
  const [allocationWalletId, setAllocationWalletId] = useState(wallets[0]?.id ?? "")
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "")
  const [allocationLabel, setAllocationLabel] = useState("")
  const [allocationAmount, setAllocationAmount] = useState("")
  const allocationWallet = wallets.find((wallet) => wallet.id === allocationWalletId)

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-3 text-primary-foreground">
          <p className="text-sm font-semibold">{t("fin_alloc_title")}</p>
          <p className="mt-0.5 text-xs text-primary-foreground/85">{t("fin_alloc_sub")}</p>
        </div>
        <div className="p-3 sm:p-4">
          <div className="mb-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
            <p className="text-muted-foreground">{t("fin_alloc_available")}</p>
            <p className="mt-0.5 font-semibold text-foreground">{formatFcfa(allocationWallet?.currentBalance ?? 0)}</p>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">{t("fin_alloc_manager")}</label>
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm">
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium text-muted-foreground">{t("fin_alloc_wallet_src")}</label>
            <select value={allocationWalletId} onChange={(e) => setAllocationWalletId(e.target.value)} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm">
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({formatFcfa(wallet.currentBalance)})
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium text-muted-foreground">{t("fin_alloc_motif")}</label>
            <input value={allocationLabel} onChange={(e) => setAllocationLabel(e.target.value)} placeholder={t("fin_alloc_motif_ph")} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <label className="block text-xs font-medium text-muted-foreground">{t("fin_alloc_amount")}</label>
            <input value={allocationAmount} onChange={(e) => setAllocationAmount(e.target.value)} type="number" placeholder={t("fin_alloc_amount_ph")} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <button
              onClick={() => {
                const result = requestManagerTransfer(allocationWalletId, managerId, allocationLabel, Number(allocationAmount))
                if (!result.ok) {
                  toast({ title: t("fin_alloc_toast_refuse"), description: result.reason, variant: "destructive" })
                  return
                }
                setAllocationLabel("")
                setAllocationAmount("")
                toast({
                  title: t("fin_alloc_toast_ok_title"),
                  description: t("fin_alloc_toast_ok_desc"),
                })
              }}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <HandCoins className="size-4" /> {t("fin_alloc_btn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
