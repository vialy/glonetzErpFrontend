"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Paperclip, Sparkles } from "lucide-react"
import {
  MANAGER_EXPENSE_CATEGORIES,
  ManagerWalletService,
} from "@/domains/manager-wallet"
import type { ManagerBudgetSummary, ManagerPaymentMethod } from "@/domains/manager-wallet/types"
import { ManagerCategoryIcon } from "@/components/manager-category-icon"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"
import { cn } from "@/lib/utils"
import type { ManagerExpenseRecord } from "@/domains/manager-wallet/types"

export default function ManagerNouvelleDepensePage() {
  const { t } = useLocale()
  const [summary, setSummary] = useState<ManagerBudgetSummary | null>(null)
  const [recentExpenses, setRecentExpenses] = useState<ManagerExpenseRecord[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [spentDate, setSpentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<ManagerPaymentMethod>("cash")
  const [comment, setComment] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setSummary(ManagerWalletService.getSummary())
      setRecentExpenses(ManagerWalletService.getExpenses().slice(0, 5))
    }
    refresh()
    window.addEventListener("manager-wallet-updated", refresh)
    return () => window.removeEventListener("manager-wallet-updated", refresh)
  }, [])

  const selectedCat = useMemo(
    () => MANAGER_EXPENSE_CATEGORIES.find((c) => c.id === categoryId),
    [categoryId]
  )

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      if (!selectedCat) {
        setMessage({ type: "err", text: t("mgr_err_category") })
        return
      }
      const num = Number(amount)
      await ManagerWalletService.createExpense({
        categoryId: selectedCat.id,
        categoryLabel: t(selectedCat.labelKey),
        amount: num,
        spentAt: spentDate,
        paymentMethod: method,
        comment: comment || undefined,
        attachmentFile: file,
      })
      setAmount("")
      setComment("")
      setFile(null)
      setCategoryId(null)
      setMessage({ type: "ok", text: t("mgr_success") })
      setSummary(ManagerWalletService.getSummary())
      setRecentExpenses(ManagerWalletService.getExpenses().slice(0, 5))
    } catch (e) {
      const code = e instanceof Error ? e.message : "UNKNOWN"
      if (code === "INSUFFICIENT_BALANCE") setMessage({ type: "err", text: t("mgr_err_insufficient") })
      else if (code === "INVALID_AMOUNT") setMessage({ type: "err", text: t("mgr_err_amount") })
      else if (code === "CATEGORY_REQUIRED") setMessage({ type: "err", text: t("mgr_err_category") })
      else setMessage({ type: "err", text: t("mgr_err_amount") })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-none px-4 py-5 pb-32 md:px-6 md:pb-12">
      <MobileBackButton fallbackHref="/dashboard" />
      <div className="mb-2 hidden md:block">
        <Button variant="ghost" size="sm" className="gap-1 px-0 text-muted-foreground" asChild>
          <Link href="/dashboard/manager/depenses">
            <ArrowLeft className="size-4" />
            {t("mgr_nav_list")}
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-5 text-white shadow-lg md:p-6 dark:from-slate-900 dark:to-slate-950">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="size-5 text-amber-300" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">{t("mgr_new_title")}</h1>
            <p className="mt-1 text-sm text-white/80 leading-relaxed">{t("mgr_new_hint")}</p>
          </div>
        </div>
        {summary ? (
          <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm">
            <span className="text-white/75">{t("mgr_card_remaining")}:</span>
            <span className="font-semibold tabular-nums">{formatFcfa(summary.remaining)}</span>
          </div>
        ) : null}
      </div>

      {message ? (
        <div
          className={cn(
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            message.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t("mgr_pick_category")}</h2>
            <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin [scrollbar-width:thin]">
              {MANAGER_EXPENSE_CATEGORIES.map((c) => {
                const active = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex min-w-[132px] max-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border-2 bg-card p-4 text-center shadow-sm transition-all active:scale-[0.98]",
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/80 hover:border-primary/35 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ManagerCategoryIcon icon={c.icon} className="size-5" />
                    </span>
                    <span className="text-xs font-medium leading-tight text-balance">{t(c.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <Card className="mt-6 border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t("mgr_payment_method")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>{t("mgr_payment_method")}</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as ManagerPaymentMethod)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("mgr_method_cash")}</SelectItem>
                    <SelectItem value="mtn_momo">{t("mgr_method_mtn")}</SelectItem>
                    <SelectItem value="orange_money">{t("mgr_method_om")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("mgr_method_bank")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mgr-amt">{t("mgr_amount")}</Label>
                  <Input
                    id="mgr-amt"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mgr-date">{t("mgr_date")}</Label>
                  <Input
                    id="mgr-date"
                    type="date"
                    value={spentDate}
                    onChange={(e) => setSpentDate(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mgr-com">{t("mgr_comment")}</Label>
                <Textarea
                  id="mgr-com"
                  rows={3}
                  placeholder={t("mgr_comment_ph")}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[88px] rounded-xl resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("mgr_attachment")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    className="h-11 cursor-pointer rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <Button type="button" variant="outline" size="sm" className="h-11 rounded-xl" onClick={() => setFile(null)}>
                      {t("mgr_remove_file")}
                    </Button>
                  ) : null}
                </div>
                {file ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="size-3.5" />
                    {file.name}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Button
              className="h-12 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/20 md:max-w-md"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? t("mgr_submitting") : t("mgr_submit")}
            </Button>
          </div>
        </div>

        <aside className="xl:col-span-4 xl:mt-8">
          <div className="space-y-4 xl:sticky xl:top-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Résumé budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("mgr_card_budget")}</span>
                  <span className="font-semibold tabular-nums">{summary ? formatFcfa(summary.envelopeCeiling) : "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("mgr_card_spent")}</span>
                  <span className="font-semibold tabular-nums">{summary ? formatFcfa(summary.totalSpent) : "-"}</span>
                </div>
                <div className="flex justify-between gap-2 border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">{t("mgr_card_remaining")}</span>
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {summary ? formatFcfa(summary.remaining) : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dernières dépenses</CardTitle>
              </CardHeader>
              <CardContent>
                {recentExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune dépense récente.</p>
                ) : (
                  <ul className="space-y-2">
                    {recentExpenses.map((e) => (
                      <li key={e.id} className="rounded-lg border border-border/50 p-2">
                        <p className="text-xs font-medium line-clamp-1">{e.categoryLabel}</p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="tabular-nums">{formatFcfa(e.amount)}</span>
                          <span>{new Date(e.spentAt).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardContent className="pt-5 text-xs text-muted-foreground leading-relaxed">
                Astuce: sélectionnez d'abord une catégorie, puis renseignez le montant et le justificatif pour garder un suivi propre.
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}
