"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, HandCoins, Loader2 } from "lucide-react"
import { InlineFieldSkeleton } from "@/components/loading/data-skeletons"
import { formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFinanceContext } from "@/app/dashboard/admin/finances/finance-context"
import { useLocale } from "@/hooks/use-locale"
import { isApiDataProvider } from "@/lib/data-provider"
import { getApiErrorMessage } from "@/lib/api-error"
import { staffMembersService, type StaffMember } from "@/domains/staff"
import { fetchMyAccount, type StaffAccount } from "@/services/staff-accounts.service"
import {
  fetchStaffWithdrawalAccounts,
  initiateStaffWithdrawal,
} from "@/services/staff-withdrawals.service"
import { computeWithdrawalFee } from "@/lib/withdrawal-fees"
import type { WithdrawalAccountRecord } from "@/domains/withdrawal-accounts/types"

export function ManagerAllocationView({ embedded = false }: { embedded?: boolean }) {
  return isApiDataProvider() ? <ApiManagerAllocation embedded={embedded} /> : <MockManagerAllocation embedded={embedded} />
}

/** Affectation reelle : payout societe vers compte Neero/MoMo du manager (POST /staff/withdrawals). */
function ApiManagerAllocation({ embedded }: { embedded: boolean }) {
  const { t } = useLocale()
  const router = useRouter()
  const [company, setCompany] = useState<StaffAccount | null>(null)
  const [managers, setManagers] = useState<StaffMember[]>([])
  const [managerId, setManagerId] = useState("")
  const [withdrawalAccounts, setWithdrawalAccounts] = useState<WithdrawalAccountRecord[]>([])
  const [withdrawalAccountId, setWithdrawalAccountId] = useState("")
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState<"idle" | "processing" | "done">("idle")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadCompany = useCallback(async () => {
    try {
      setCompany(await fetchMyAccount())
    } catch {
      setCompany(null)
    }
  }, [])

  useEffect(() => {
    void loadCompany()
    staffMembersService
      .list({ role: "manager" })
      .then((list) => {
        const active = list.filter((m) => m.status === "active")
        setManagers(active)
        setManagerId((prev) => prev || active[0]?.id || "")
      })
      .catch(() => setManagers([]))
  }, [loadCompany])

  useEffect(() => {
    if (!managerId) {
      setWithdrawalAccounts([])
      setWithdrawalAccountId("")
      return
    }
    setLoadingAccounts(true)
    fetchStaffWithdrawalAccounts(managerId)
      .then((list) => {
        setWithdrawalAccounts(list)
        setWithdrawalAccountId(list[0]?.id ?? "")
      })
      .catch(() => {
        setWithdrawalAccounts([])
        setWithdrawalAccountId("")
      })
      .finally(() => setLoadingAccounts(false))
  }, [managerId])

  const amountValue = Number(amount)
  const balance = company?.balance ?? 0
  const positiveAmount = Number.isFinite(amountValue) && amountValue > 0 ? amountValue : 0
  const feeAmount = computeWithdrawalFee(positiveAmount)
  const totalDebit = positiveAmount + feeAmount
  const neeroTransfer = totalDebit
  const remainingAfter = balance - totalDebit
  const selectedManager = managers.find((m) => m.id === managerId)
  const selectedAccount = withdrawalAccounts.find((a) => a.id === withdrawalAccountId)
  const initials = (selectedManager?.fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?"
  const canSubmit =
    Boolean(managerId) &&
    Boolean(withdrawalAccountId) &&
    label.trim().length > 0 &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    totalDebit <= balance &&
    !submitting &&
    !loadingAccounts

  async function handleSubmit() {
    if (!managerId) {
      toast({ title: t("fin_alloc_toast_refuse"), description: t("fin_alloc_manager"), variant: "destructive" })
      return
    }
    if (!withdrawalAccountId) {
      toast({ title: t("fin_alloc_toast_refuse"), description: t("fin_alloc_no_wda"), variant: "destructive" })
      return
    }
    if (!label.trim()) {
      toast({ title: t("fin_alloc_toast_refuse"), description: t("fin_alloc_motif"), variant: "destructive" })
      return
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: t("fin_alloc_toast_refuse"), description: t("fin_alloc_amount"), variant: "destructive" })
      return
    }
    if (totalDebit > balance) {
      toast({ title: t("fin_alloc_toast_refuse"), description: t("fin_alloc_insufficient"), variant: "destructive" })
      return
    }

    setSubmitting(true)
    setPhase("processing")
    try {
      await initiateStaffWithdrawal({
        beneficiaryStaffId: managerId,
        withdrawalAccountId,
        netAmount: amountValue,
        description: label.trim(),
      })
      setLabel("")
      setAmount("")
      await loadCompany()
      setConfirmOpen(false)
      setPhase("done")
      window.setTimeout(() => router.push("/dashboard/admin/finances/fonds-managers?tab=history"), 1500)
      toast({
        title: t("fin_alloc_toast_ok_title"),
        description: t("fin_alloc_toast_ok_desc_withdrawal"),
      })
    } catch (e) {
      setPhase("idle")
      toast({
        title: t("fin_alloc_toast_refuse"),
        description: getApiErrorMessage(e, t("fin_alloc_error")),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {phase !== "idle" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-2xl border bg-card p-6 text-center shadow-xl">
            {phase === "processing" ? (
              <>
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="size-7 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm font-semibold">{t("fin_alloc_btn_loading")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("fin_alloc_overlay_processing_sub")}</p>
              </>
            ) : (
              <>
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="mt-4 text-sm font-semibold">{t("fin_alloc_overlay_done")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("fin_alloc_overlay_done_sub")}</p>
              </>
            )}
          </div>
        </div>
      ) : null}

      {!embedded ? (
        <div className="mb-4">
          <h1 className="text-lg font-semibold tracking-tight">{t("fin_alloc_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("fin_alloc_sub")}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Colonne formulaire */}
        <div className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:col-span-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("fin_alloc_recipient")}</label>
            <div className="flex items-center gap-3 rounded-xl border bg-background px-2.5 py-2 focus-within:ring-2 focus-within:ring-primary/30">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="min-h-9 w-full min-w-0 flex-1 truncate bg-transparent text-sm outline-none"
              >
                {managers.length === 0 ? <option value="">{t("fin_alloc_no_manager")}</option> : null}
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName} ({manager.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("fin_alloc_wda")}</label>
            {loadingAccounts ? (
              <InlineFieldSkeleton width="w-full" />
            ) : withdrawalAccounts.length === 0 ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                {t("fin_alloc_no_wda")}
              </p>
            ) : (
              <select
                value={withdrawalAccountId}
                onChange={(e) => setWithdrawalAccountId(e.target.value)}
                className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
              >
                {withdrawalAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.provider.toUpperCase()} · {account.phoneNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("fin_alloc_net_amount")}</label>
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="w-full rounded-xl border bg-background px-4 py-3 pr-16 text-2xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                FCFA
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("fin_alloc_withdrawal_amount_hint")}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("fin_alloc_motif")}</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("fin_alloc_motif_ph")}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Colonne récapitulatif (type paiement) */}
        <div className="lg:col-span-2">
          <div className="space-y-3 rounded-2xl border bg-gradient-to-b from-muted/30 to-card p-4 shadow-sm lg:sticky lg:top-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("fin_alloc_breakdown_title")}
            </p>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("fin_alloc_net_amount")}</span>
                <span className="font-medium tabular-nums">{formatFcfa(positiveAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("fin_alloc_fee")}</span>
                <span className="font-medium tabular-nums">{formatFcfa(feeAmount)}</span>
              </div>
              {selectedAccount ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("fin_alloc_wda")}</span>
                  <span className="font-medium">{selectedAccount.provider.toUpperCase()} · {selectedAccount.phoneNumber}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-semibold">{t("fin_alloc_total_debit")}</span>
              <span
                className={`text-lg font-extrabold tabular-nums ${
                  totalDebit > balance ? "text-destructive" : "text-foreground"
                }`}
              >
                {formatFcfa(totalDebit)}
              </span>
            </div>

            <div className="space-y-1 rounded-xl bg-background/70 p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("fin_alloc_mgr_receives")}</span>
                <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatFcfa(neeroTransfer)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("fin_alloc_usable_after")}</span>
                <span className="font-medium tabular-nums">{formatFcfa(positiveAmount)}</span>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">{t("fin_alloc_withdrawal_neero_hint")}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{t("fin_alloc_fee_on_success_hint")}</p>
            </div>

            <div className="space-y-1 rounded-xl border bg-card p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("fin_alloc_company_balance")}</span>
                <span className="font-medium tabular-nums">{formatFcfa(balance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("fin_alloc_remaining_after")}</span>
                <span className={`font-medium tabular-nums ${remainingAfter < 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatFcfa(remainingAfter)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-50"
            >
              <HandCoins className="size-4" />
              {submitting ? t("fin_alloc_btn_loading") : `${t("fin_alloc_pay")} · ${formatFcfa(totalDebit)}`}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_alloc_confirm_transfer_title")}</DialogTitle>
            <DialogDescription>
              {t("fin_alloc_confirm_transfer_desc")
                .replace("{amount}", formatFcfa(totalDebit))
                .replace("{manager}", selectedManager?.fullName ?? "-")
                .replace("{label}", label.trim())}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? t("fin_alloc_btn_loading") : t("fin_alloc_confirm_transfer_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Ancien flux mock (FinanceProvider en memoire). */
function MockManagerAllocation({ embedded }: { embedded: boolean }) {
  const { t } = useLocale()
  const { wallets, managers, requestManagerTransfer } = useFinanceContext()
  const [allocationWalletId, setAllocationWalletId] = useState(wallets[0]?.id ?? "")
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "")
  const [allocationLabel, setAllocationLabel] = useState("")
  const [allocationAmount, setAllocationAmount] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const allocationWallet = wallets.find((wallet) => wallet.id === allocationWalletId)
  const selectedManager = managers.find((m) => m.id === managerId)

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {!embedded ? (
          <div className="bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-3 text-primary-foreground">
            <p className="text-sm font-semibold">{t("fin_alloc_title")}</p>
            <p className="mt-0.5 text-xs text-primary-foreground/85">{t("fin_alloc_sub")}</p>
          </div>
        ) : null}
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
              onClick={() => setConfirmOpen(true)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <HandCoins className="size-4" /> {t("fin_alloc_btn")}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_alloc_confirm_transfer_title")}</DialogTitle>
            <DialogDescription>
              {t("fin_alloc_confirm_transfer_desc")
                .replace("{amount}", formatFcfa(Number(allocationAmount)))
                .replace("{manager}", selectedManager?.fullName ?? "-")
                .replace("{label}", allocationLabel.trim())}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                const result = requestManagerTransfer(allocationWalletId, managerId, allocationLabel, Number(allocationAmount))
                if (!result.ok) {
                  toast({ title: t("fin_alloc_toast_refuse"), description: result.reason, variant: "destructive" })
                  return
                }
                setAllocationLabel("")
                setAllocationAmount("")
                setConfirmOpen(false)
                toast({
                  title: t("fin_alloc_toast_ok_title"),
                  description: t("fin_alloc_toast_ok_desc"),
                })
              }}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
            >
              {t("fin_alloc_confirm_transfer_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
