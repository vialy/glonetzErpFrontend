"use client"

import { useMemo, useState } from "react"
import { Building2, HandCoins, PlusCircle, Wallet } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFinanceContext } from "../finance-context"
import { useLocale } from "@/hooks/use-locale"

export default function WalletAccountsPage() {
  const { t, locale } = useLocale()
  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
  const { wallets, operations, activeWalletId, setActiveWalletId, createWallet, addBusinessInflow, deleteWallet } = useFinanceContext()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteWalletId, setDeleteWalletId] = useState<string | null>(null)
  const [walletName, setWalletName] = useState("")
  const [walletDescription, setWalletDescription] = useState("")
  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")

  const activeWallet = wallets.find((w) => w.id === activeWalletId) ?? wallets[0]
  const walletToDelete = wallets.find((w) => w.id === deleteWalletId) ?? null
  const visibleOperations = useMemo(
    () => operations.filter((op) => (activeWallet ? op.walletId === activeWallet.id : true)).slice().reverse(),
    [operations, activeWallet]
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-3 sm:p-4 xl:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{t("fin_wallets_title")}</p>
            <button onClick={() => setCreateOpen(true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <PlusCircle className="size-3.5" /> {t("fin_wallets_create")}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveWalletId(wallet.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setActiveWalletId(wallet.id)
                  }
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  activeWalletId === wallet.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                <p className="text-sm font-semibold leading-tight">{wallet.name}</p>
                  {wallet.type === "tuition" ? <Wallet className="size-4 text-sky-600" /> : <Building2 className="size-4 text-indigo-600" />}
                </div>
                <p className="mt-2 text-xl font-bold">{formatMoney(wallet.currentBalance)}</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">{wallet.description}</p>
                {wallet.type !== "tuition" ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteWalletId(wallet.id)
                    }}
                    className="mt-3 min-h-8 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/5"
                  >
                    {t("fin_wallets_delete")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-sm font-semibold">{t("fin_wallets_credit_title")}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-snug">
            {t("fin_wallets_selected")} {activeWallet?.name ?? "-"}
          </p>
          <div className="mt-3 space-y-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("fin_wallets_inflow_label")}
              className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder={t("fin_wallets_amount_ph")}
              className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                const result = addBusinessInflow(activeWallet.id, label, Number(amount))
                if (!result.ok) {
                  toast({ title: t("fin_wallets_toast_refused"), description: result.reason, variant: "destructive" })
                  return
                }
                setLabel("")
                setAmount("")
                toast({ title: t("fin_wallets_toast_inflow_ok"), description: t("fin_wallets_toast_inflow_desc") })
              }}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <HandCoins className="size-4" /> {t("fin_wallets_credit_btn")}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="text-sm font-semibold">{t("fin_wallets_history")}</p>
          <p className="text-xs text-muted-foreground">
            {visibleOperations.length} {t("fin_wallets_ops_count")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("fin_wallets_th_date")}</th>
                <th className="px-4 py-3">{t("fin_wallets_th_type")}</th>
                <th className="px-4 py-3">{t("fin_wallets_th_label")}</th>
                <th className="px-4 py-3">{t("fin_wallets_th_amount")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleOperations.map((op) => (
                <tr key={op.id} className="border-t">
                  <td className="px-4 py-3">{op.createdAt}</td>
                  <td className="px-4 py-3">
                    {op.type === "inflow"
                      ? t("fin_wallets_type_inflow")
                      : op.type === "manager_allocation"
                        ? t("fin_wallets_type_mgr")
                        : t("fin_wallets_type_extra")}
                  </td>
                  <td className="px-4 py-3">{op.label}</td>
                  <td className={`px-4 py-3 font-medium ${op.type === "inflow" ? "text-emerald-700" : "text-amber-700"}`}>
                    {op.type === "inflow" ? "+" : "-"} {formatMoney(op.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_wallets_dialog_create")}</DialogTitle>
            <DialogDescription>{t("fin_wallets_dialog_create_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <input
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder={t("fin_wallets_ph_name")}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={walletDescription}
              onChange={(e) => setWalletDescription(e.target.value)}
              placeholder={t("fin_wallets_ph_desc")}
              className="min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              onClick={() => {
                const result = createWallet(walletName, walletDescription)
                if (!result.ok) {
                  toast({ title: t("fin_wallets_toast_create_fail"), description: result.reason, variant: "destructive" })
                  return
                }
                setWalletName("")
                setWalletDescription("")
                setCreateOpen(false)
                toast({ title: t("fin_wallets_toast_create_ok"), description: t("fin_wallets_toast_create_ok_desc") })
              }}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
            >
              {t("fin_wallets_create_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteWalletId)} onOpenChange={(open) => !open && setDeleteWalletId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_wallets_dialog_delete")}</DialogTitle>
            <DialogDescription>
              {walletToDelete ? t("fin_wallets_dialog_delete_desc").replace("{name}", walletToDelete.name) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteWalletId(null)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              onClick={() => {
                if (!walletToDelete) return
                const result = deleteWallet(walletToDelete.id)
                if (!result.ok) {
                  toast({ title: t("fin_wallets_toast_del_fail"), description: result.reason, variant: "destructive" })
                  return
                }
                setDeleteWalletId(null)
                toast({
                  title: t("fin_wallets_toast_del_ok"),
                  description: t("fin_wallets_toast_del_ok_desc").replace("{name}", walletToDelete.name),
                })
              }}
              className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground"
            >
              {t("fin_wallets_delete_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
