"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, HandCoins, Loader2, PlusCircle, Wallet, ArrowRightLeft } from "lucide-react"
import { CardListSkeleton, KpiCardsSkeleton, TableRowsSkeleton } from "@/components/loading/data-skeletons"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataLoadError } from "@/components/data-load-error"
import { useLocale } from "@/hooks/use-locale"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import type { TranslationKey } from "@/services/i18n"
import {
  adjustAccount,
  createVirtualAccount,
  fetchAccountStatementById,
  fetchTreasuryWallets,
  STAFF_ACCOUNTS_UPDATED_EVENT,
  transferBetweenTreasuryAccounts,
  updateVirtualAccount,
  type StaffAccount,
  type StatementEntry,
} from "@/services/staff-accounts.service"

function formatMoney(value: number, locale: "fr" | "en") {
  return `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`
}

function formatDate(iso: string, locale: "fr" | "en") {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function entryTypeLabel(entry: StatementEntry, t: (k: TranslationKey) => string) {
  if (entry.source === "adjustment") return t("fin_wallets_type_adjustment")
  if (entry.source === "transfer") return t("fin_wallets_type_treasury_transfer")
  if (entry.source === "payment") return t("fin_wallets_type_payment")
  if (entry.source === "withdrawal") return t("fin_wallets_type_withdrawal")
  return entry.direction === "in" ? t("fin_wallets_type_inflow") : t("fin_wallets_type_extra")
}

export function ApiTreasuryWallets() {
  const { t, locale } = useLocale()
  const [wallets, setWallets] = useState<StaffAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState("")
  const [entries, setEntries] = useState<StatementEntry[]>([])
  const [loadingWallets, setLoadingWallets] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [walletError, setWalletError] = useState<unknown>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [walletName, setWalletName] = useState("")
  const [walletDescription, setWalletDescription] = useState("")
  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [creditConfirmOpen, setCreditConfirmOpen] = useState(false)
  const [transferToId, setTransferToId] = useState("")
  const [transferLabel, setTransferLabel] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false)

  const loadWallets = useCallback(async () => {
    setLoadingWallets(true)
    setWalletError(null)
    try {
      const list = await fetchTreasuryWallets()
      setWallets(list)
      setActiveAccountId((prev) => {
        if (prev && list.some((w) => w.accountId === prev)) return prev
        return list[0]?.accountId ?? ""
      })
    } catch (e) {
      setWalletError(e)
    } finally {
      setLoadingWallets(false)
    }
  }, [])

  const loadHistory = useCallback(async (accountId: string) => {
    if (!accountId) {
      setEntries([])
      return
    }
    setLoadingHistory(true)
    try {
      const { entries: rows } = await fetchAccountStatementById(accountId)
      setEntries(rows)
    } catch {
      setEntries([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const activeWallet = useMemo(
    () => wallets.find((w) => w.accountId === activeAccountId) ?? wallets[0],
    [wallets, activeAccountId],
  )

  const transferTargets = useMemo(
    () => wallets.filter((w) => w.accountId !== activeAccountId),
    [wallets, activeAccountId],
  )

  const transferToWallet = useMemo(
    () => wallets.find((w) => w.accountId === transferToId) ?? null,
    [wallets, transferToId],
  )

  useEffect(() => {
    setTransferToId((prev) => {
      if (prev && transferTargets.some((w) => w.accountId === prev)) return prev
      return transferTargets[0]?.accountId ?? ""
    })
  }, [transferTargets])

  useEffect(() => {
    void loadWallets()
    const onUpdated = () => void loadWallets()
    window.addEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(STAFF_ACCOUNTS_UPDATED_EVENT, onUpdated)
  }, [loadWallets])

  useEffect(() => {
    void loadHistory(activeAccountId)
  }, [activeAccountId, loadHistory])

  const walletToDeactivate = wallets.find((w) => w.accountId === deactivateId) ?? null

  function openCreditConfirm() {
    if (!activeWallet) return
    const description = label.trim()
    const amountValue = Number(amount)
    if (!description) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_label"), variant: "destructive" })
      return
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_amount"), variant: "destructive" })
      return
    }
    setCreditConfirmOpen(true)
  }

  async function handleCredit() {
    if (!activeWallet) return
    const description = label.trim()
    const amountValue = Number(amount)
    if (!description) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_label"), variant: "destructive" })
      return
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_amount"), variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      await adjustAccount(activeWallet.accountId, {
        type: "credit",
        amount: amountValue,
        description,
      })
      setLabel("")
      setAmount("")
      await loadWallets()
      await loadHistory(activeWallet.accountId)
      setCreditConfirmOpen(false)
      toast({ title: t("fin_wallets_toast_inflow_ok"), description: t("fin_wallets_toast_inflow_desc") })
    } catch (e) {
      toast({
        title: t("fin_wallets_toast_refused"),
        description: getApiErrorMessage(e, t("fin_wallets_toast_refused")),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  function openTransferConfirm() {
    if (!activeWallet || !transferToWallet) return
    const description = transferLabel.trim()
    const amountValue = Number(transferAmount)
    if (!description) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_label"), variant: "destructive" })
      return
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_amount"), variant: "destructive" })
      return
    }
    if (activeWallet.accountId === transferToWallet.accountId) {
      toast({ title: t("fin_wallets_toast_refused"), description: t("fin_wallets_err_same_account"), variant: "destructive" })
      return
    }
    setTransferConfirmOpen(true)
  }

  async function handleTransfer() {
    if (!activeWallet || !transferToWallet) return
    const description = transferLabel.trim()
    const amountValue = Number(transferAmount)
    if (!description || !Number.isFinite(amountValue) || amountValue <= 0) return
    setSubmitting(true)
    try {
      await transferBetweenTreasuryAccounts({
        fromAccountId: activeWallet.accountId,
        toAccountId: transferToWallet.accountId,
        amount: amountValue,
        description,
      })
      setTransferLabel("")
      setTransferAmount("")
      await loadWallets()
      await loadHistory(activeAccountId)
      setTransferConfirmOpen(false)
      toast({ title: t("fin_wallets_toast_transfer_ok"), description: t("fin_wallets_toast_transfer_desc") })
    } catch (e) {
      toast({
        title: t("fin_wallets_toast_refused"),
        description: getApiErrorMessage(e, t("fin_wallets_toast_refused")),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreate() {
    const name = walletName.trim()
    if (!name) {
      toast({ title: t("fin_wallets_toast_create_fail"), description: t("fin_wallets_err_name"), variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const created = await createVirtualAccount({
        name,
        description: walletDescription.trim() || undefined,
      })
      setWalletName("")
      setWalletDescription("")
      setCreateOpen(false)
      setActiveAccountId(created.accountId)
      await loadWallets()
      toast({ title: t("fin_wallets_toast_create_ok"), description: t("fin_wallets_toast_create_ok_desc") })
    } catch (e) {
      toast({
        title: t("fin_wallets_toast_create_fail"),
        description: getApiErrorMessage(e, t("fin_wallets_toast_create_fail")),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (!walletToDeactivate) return
    if (walletToDeactivate.balance > 0) {
      toast({ title: t("fin_wallets_toast_del_fail"), description: t("fin_wallets_err_balance"), variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      await updateVirtualAccount(walletToDeactivate.accountId, { isActive: false })
      setDeactivateId(null)
      await loadWallets()
      toast({
        title: t("fin_wallets_toast_deactivate_ok"),
        description: t("fin_wallets_toast_deactivate_ok_desc").replace("{name}", walletToDeactivate.name),
      })
    } catch (e) {
      toast({
        title: t("fin_wallets_toast_del_fail"),
        description: getApiErrorMessage(e, t("fin_wallets_toast_del_fail")),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (walletError && wallets.length === 0 && !loadingWallets) {
    return <DataLoadError onRetry={() => void loadWallets()} retrying={loadingWallets} />
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.3)] sm:p-4 xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/15 pb-3">
            <p className="text-sm font-bold">{t("fin_wallets_title")}</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-sky-900/20"
            >
              <PlusCircle className="size-3.5" /> {t("fin_wallets_create")}
            </button>
          </div>

          {loadingWallets ? (
            <KpiCardsSkeleton count={4} className="sm:grid-cols-2" />
          ) : wallets.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("fin_real_accounts_empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {wallets.map((wallet) => (
                <div
                  key={wallet.accountId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveAccountId(wallet.accountId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setActiveAccountId(wallet.accountId)
                    }
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                    activeAccountId === wallet.accountId
                      ? wallet.type === "company"
                        ? "border-sky-500/40 bg-gradient-to-br from-sky-500/15 via-sky-50/40 to-background shadow-lg shadow-sky-900/10 dark:from-sky-500/10 dark:via-sky-950/20"
                        : "border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 via-indigo-50/40 to-background shadow-lg shadow-indigo-900/10 dark:from-indigo-500/10 dark:via-indigo-950/20"
                      : "border-border/60 bg-muted/10 hover:bg-muted/25",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-[3px]",
                      activeAccountId === wallet.accountId
                        ? wallet.type === "company"
                          ? "bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500"
                          : "bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500"
                        : "bg-transparent",
                    )}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">{wallet.name}</p>
                    {wallet.type === "company" ? (
                      <Wallet className="size-4 shrink-0 text-sky-600" />
                    ) : (
                      <Building2 className="size-4 shrink-0 text-indigo-600" />
                    )}
                  </div>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {wallet.type === "company" ? t("fin_wallets_type_company") : t("fin_wallets_type_virtual")}
                  </p>
                  <p className="mt-2 text-xl font-bold tabular-nums">{formatMoney(wallet.balance, locale)}</p>
                  {wallet.description ? (
                    <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{wallet.description}</p>
                  ) : null}
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">{wallet.accountId}</p>
                  {wallet.type === "virtual" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeactivateId(wallet.accountId)
                      }}
                      className="mt-3 min-h-8 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/5"
                    >
                      {t("fin_wallets_deactivate")}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-sky-500/8 via-card to-card p-3 shadow-sm sm:p-4">
          <div className="mb-1 h-[3px] w-12 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500" />
          <p className="text-sm font-bold">{t("fin_wallets_credit_title")}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t("fin_wallets_selected")} {activeWallet?.name ?? "-"}
          </p>
          <div className="mt-3 space-y-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("fin_wallets_inflow_label")}
              disabled={!activeWallet || submitting}
              className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder={t("fin_wallets_amount_ph")}
              disabled={!activeWallet || submitting}
              className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => openCreditConfirm()}
              disabled={!activeWallet || submitting}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <HandCoins className="size-4" />}
              {t("fin_wallets_credit_btn")}
            </button>
          </div>

          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="mb-1 h-[3px] w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <p className="text-sm font-bold">{t("fin_wallets_transfer_title")}</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{t("fin_wallets_transfer_desc")}</p>
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">{t("fin_wallets_transfer_from")}</label>
              <p className="rounded-lg border bg-muted/20 px-3 py-2 text-sm font-medium">{activeWallet?.name ?? "-"}</p>
              <label className="block text-xs font-medium text-muted-foreground">{t("fin_wallets_transfer_to")}</label>
              <select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                disabled={!activeWallet || submitting || transferTargets.length === 0}
                className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {transferTargets.length === 0 ? (
                  <option value="">{t("fin_wallets_loading")}</option>
                ) : (
                  transferTargets.map((wallet) => (
                    <option key={wallet.accountId} value={wallet.accountId}>
                      {wallet.name} ({formatMoney(wallet.balance, locale)})
                    </option>
                  ))
                )}
              </select>
              <input
                value={transferLabel}
                onChange={(e) => setTransferLabel(e.target.value)}
                placeholder={t("fin_wallets_transfer_label")}
                disabled={!activeWallet || submitting || transferTargets.length === 0}
                className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                type="number"
                placeholder={t("fin_wallets_amount_ph")}
                disabled={!activeWallet || submitting || transferTargets.length === 0}
                className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => openTransferConfirm()}
                disabled={!activeWallet || !transferToWallet || submitting || transferTargets.length === 0}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
                {t("fin_wallets_transfer_btn")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="text-sm font-semibold">{t("fin_wallets_history")}</p>
          <p className="text-xs text-muted-foreground">
            {entries.length} {t("fin_wallets_ops_count")}
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
              {loadingHistory ? (
                <TableRowsSkeleton rows={5} cols={4} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {t("fin_wallets_history_empty")}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-4 py-3">{formatDate(entry.createdAt, locale)}</td>
                    <td className="px-4 py-3">{entryTypeLabel(entry, t)}</td>
                    <td className="px-4 py-3">{entry.description || "-"}</td>
                    <td
                      className={`px-4 py-3 font-medium tabular-nums ${
                        entry.direction === "in" ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {entry.direction === "in" ? "+" : "-"} {formatMoney(entry.totalAmount, locale)}
                    </td>
                  </tr>
                ))
              )}
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
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleCreate()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : t("fin_wallets_create_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deactivateId)} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_wallets_dialog_deactivate")}</DialogTitle>
            <DialogDescription>
              {walletToDeactivate
                ? t("fin_wallets_dialog_deactivate_desc").replace("{name}", walletToDeactivate.name)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setDeactivateId(null)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleDeactivate()}
              className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : t("fin_wallets_deactivate_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditConfirmOpen} onOpenChange={setCreditConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_wallets_confirm_credit_title")}</DialogTitle>
            <DialogDescription>
              {activeWallet
                ? t("fin_wallets_confirm_credit_desc")
                    .replace("{amount}", formatMoney(Number(amount), locale))
                    .replace("{wallet}", activeWallet.name)
                    .replace("{label}", label.trim())
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setCreditConfirmOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleCredit()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : t("fin_wallets_confirm_credit_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferConfirmOpen} onOpenChange={setTransferConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_wallets_transfer_confirm_title")}</DialogTitle>
            <DialogDescription>
              {activeWallet && transferToWallet
                ? t("fin_wallets_transfer_confirm_desc")
                    .replace("{amount}", formatMoney(Number(transferAmount), locale))
                    .replace("{from}", activeWallet.name)
                    .replace("{to}", transferToWallet.name)
                    .replace("{label}", transferLabel.trim())
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setTransferConfirmOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleTransfer()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : t("fin_wallets_transfer_confirm_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
