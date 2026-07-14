"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CheckCircle2, Clock3, XCircle } from "lucide-react"
import { KpiCardsSkeleton, TableRowsSkeleton } from "@/components/loading/data-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownLeft, ArrowUpRight, Building2, Wallet } from "lucide-react"
import { useManagerAccount } from "@/hooks/use-manager-account"
import { useStaffAccounts } from "@/hooks/use-staff-accounts"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"
import type { StatementEntry, StaffAccountWithOwner } from "@/services/staff-accounts.service"
import {
  fetchStaffWithdrawals,
  WITHDRAWALS_UPDATED_EVENT,
  type StaffWithdrawalRecord,
} from "@/services/staff-withdrawals.service"

function monthlyCashflow(entries: StatementEntry[], locale: "fr" | "en") {
  const now = new Date()
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "short" }),
      in: 0,
      out: 0,
    }
  })
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  for (const e of entries) {
    const d = new Date(e.createdAt)
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i === undefined) continue
    if (e.direction === "in") buckets[i].in += e.totalAmount
    else buckets[i].out += e.totalAmount
  }
  return buckets
}

function ownerLabel(account: StaffAccountWithOwner, t: ReturnType<typeof useLocale>["t"]): string {
  if (account.type === "company") return t("fin_real_type_company")
  return account.owner?.name || account.name || t("fin_real_type_staff")
}

function WithdrawalStatusBadge({
  status,
  t,
}: {
  status: StaffWithdrawalRecord["status"]
  t: ReturnType<typeof useLocale>["t"]
}) {
  if (status === "successful") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        {t("fin_mgr_pay_badge_success")}
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <XCircle className="size-3" />
        {t("fin_mgr_pay_badge_failed")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
      <Clock3 className="size-3" />
      {t("fin_mgr_pay_badge_pending")}
    </span>
  )
}

/** KPIs consolides + courbe entrees/sorties (releve). */
export function RealCompanyOverview() {
  return <RealCompanyCashflow />
}

/** Courbe des entrees / sorties sur 6 mois (compte societe). */
export function RealCompanyCashflow() {
  const { t, locale } = useLocale()
  const { entries, loading } = useManagerAccount()
  const chartData = useMemo(() => monthlyCashflow(entries, locale), [entries, locale])

  if (loading) {
    return <Skeleton className="h-60 w-full rounded-2xl sm:h-72" />
  }

  return (
    <div className="h-60 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="real-in" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="real-out" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value: number) => formatFcfa(value)} />
          <Area type="monotone" dataKey="in" name={t("fin_real_in")} stroke="#10b981" fill="url(#real-in)" />
          <Area type="monotone" dataKey="out" name={t("fin_real_out")} stroke="#ef4444" fill="url(#real-out)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Liste lecture seule de tous les comptes réels (société + staff). */
export function RealAccountsList() {
  const { t } = useLocale()
  const { accounts, loading } = useStaffAccounts()

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <Wallet className="size-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">{t("fin_real_accounts_title")}</p>
          <p className="text-xs text-muted-foreground">{t("fin_real_accounts_sub")}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("fin_real_th_account")}</th>
              <th className="px-4 py-3">{t("fin_real_th_owner")}</th>
              <th className="px-4 py-3">{t("fin_real_th_type")}</th>
              <th className="px-4 py-3 text-right">{t("fin_real_th_balance")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableRowsSkeleton rows={5} cols={4} />
            ) : accounts.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>
                  {t("fin_real_accounts_empty")}
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{a.accountId}</p>
                  </td>
                  <td className="px-4 py-3">{a.type === "company" ? "—" : ownerLabel(a, t)}</td>
                  <td className="px-4 py-3">
                    {a.type === "company" ? (
                      <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                        <Building2 className="size-3.5" /> {t("fin_real_type_company")}
                      </span>
                    ) : a.type === "virtual" ? (
                      <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                        <Wallet className="size-3.5" /> {t("fin_wallets_type_virtual")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("fin_real_type_staff")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatFcfa(a.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Historique des transferts managers (API withdrawals) + soldes réels des managers. */
export function RealManagerTransfers() {
  const { t, locale } = useLocale()
  const { accounts, loading: accountsLoading } = useStaffAccounts()
  const [withdrawals, setWithdrawals] = useState<StaffWithdrawalRecord[]>([])
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setWithdrawalsLoading(true)
      try {
        const rows = await fetchStaffWithdrawals()
        if (!cancelled) setWithdrawals(rows)
      } catch {
        if (!cancelled) setWithdrawals([])
      } finally {
        if (!cancelled) setWithdrawalsLoading(false)
      }
    }
    void load()
    const refresh = () => void load()
    window.addEventListener(WITHDRAWALS_UPDATED_EVENT, refresh)
    window.addEventListener("staff-accounts-updated", refresh)
    return () => {
      cancelled = true
      window.removeEventListener(WITHDRAWALS_UPDATED_EVENT, refresh)
      window.removeEventListener("staff-accounts-updated", refresh)
    }
  }, [])

  const accountNameByStaffId = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of accounts) {
      if (a.owner?.staffId) map.set(a.owner.staffId, a.owner.name || a.name)
    }
    return map
  }, [accounts])

  const managerBalances = useMemo(
    () => accounts.filter((a) => a.type === "staff" && a.owner?.role === "manager"),
    [accounts],
  )

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const entriesLoading = withdrawalsLoading

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
          <ArrowUpRight className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">{t("fin_real_transfers_title")}</p>
            <p className="text-xs text-muted-foreground">{t("fin_real_transfers_sub")}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("fin_real_th_date")}</th>
                <th className="px-4 py-3">{t("fin_real_th_beneficiary")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_phone")}</th>
                <th className="px-4 py-3">{t("fin_real_th_ref")}</th>
                <th className="px-4 py-3 text-right">{t("fin_real_th_amount")}</th>
                <th className="px-4 py-3">{t("fin_mgr_pay_th_status")}</th>
              </tr>
            </thead>
            <tbody>
              {entriesLoading ? (
                <TableRowsSkeleton rows={5} cols={6} />
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                    {t("fin_real_transfers_empty")}
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  const beneficiary =
                    w.beneficiaryName ||
                    (w.beneficiaryStaffId ? accountNameByStaffId.get(w.beneficiaryStaffId) : undefined) ||
                    "—"
                  const externalRef = w.gatewayPaymentRef || w.gatewayReference || w.id
                  return (
                    <tr key={w.id} className="border-t">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(w.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{beneficiary}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {w.phoneNumber ? `${w.provider.toUpperCase()} · ${w.phoneNumber}` : w.provider}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={externalRef}>
                        {externalRef}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                        -{formatFcfa(w.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <WithdrawalStatusBadge status={w.status} t={t} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white dark:from-slate-800 dark:to-slate-900">
          <Wallet className="size-4 opacity-90" />
          <div>
            <p className="text-sm font-semibold">{t("fin_real_manager_balances_title")}</p>
            <p className="text-xs text-white/75">{t("fin_real_manager_balances_sub")}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {accountsLoading ? (
            <KpiCardsSkeleton count={2} className="col-span-full sm:grid-cols-2" />
          ) : managerBalances.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">{t("fin_real_no_managers")}</p>
          ) : (
            managerBalances.map((a) => (
              <div key={a.id} className="rounded-xl border border-border/80 bg-muted/15 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.owner?.name || a.name}</p>
                  <ArrowDownLeft className="size-4 text-emerald-600" />
                </div>
                <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatFcfa(a.balance)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
