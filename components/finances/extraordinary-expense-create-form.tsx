"use client"

import { useMemo, useState } from "react"
import { Paperclip } from "lucide-react"
import { ManagerCategoryIcon } from "@/components/manager-category-icon"
import { ManagerCustomCategoryDialog } from "@/components/manager/manager-custom-category-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useManagerExpenseCategories } from "@/hooks/use-manager-expense-categories"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"
import { cn } from "@/lib/utils"
import type { CreateManagerExpenseInput, ManagerBudgetSummary } from "@/domains/manager-wallet/types"

type Props = {
  summary: ManagerBudgetSummary | null
  loading?: boolean
  accountName?: string
  categoriesOwnerId: string
  onSubmit: (input: CreateManagerExpenseInput) => Promise<void>
  walletField?: React.ReactNode
}

export function ExtraordinaryExpenseCreateForm({
  summary,
  loading = false,
  accountName,
  categoriesOwnerId,
  onSubmit,
  walletField,
}: Props) {
  const { t } = useLocale()
  const { categories, addCustomCategory, getCategoryLabel } = useManagerExpenseCategories(categoriesOwnerId)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [otherDialogOpen, setOtherDialogOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [spentDate, setSpentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [comment, setComment] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const selectedCat = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  )

  const parsedAmount = useMemo(() => {
    const num = Number(amount)
    if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) return null
    return num
  }, [amount])

  const exceedsBudget = useMemo(() => {
    if (parsedAmount === null || !summary) return false
    return parsedAmount > summary.remaining
  }, [parsedAmount, summary])

  const canSubmit = useMemo(() => {
    if (submitting || loading) return false
    if (!selectedCat || selectedCat.id === "other") return false
    if (parsedAmount === null) return false
    if (exceedsBudget) return false
    return true
  }, [exceedsBudget, loading, parsedAmount, selectedCat, submitting])

  function handleCategoryClick(id: string) {
    if (id === "other") {
      setOtherDialogOpen(true)
      return
    }
    setCategoryId(id)
  }

  async function handleAddCustomCategory(label: string) {
    const created = await addCustomCategory(label)
    if (!created) throw new Error("EXPENSE_CATEGORY_CREATE_FAILED")
    setCategoryId(created.id)
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      if (!selectedCat || selectedCat.id === "other") {
        setMessage({ type: "err", text: t("mgr_err_category") })
        return
      }
      const num = Number(amount)
      if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
        setMessage({ type: "err", text: t("mgr_err_amount") })
        return
      }
      if (summary && num > summary.remaining) {
        setMessage({ type: "err", text: t("mgr_err_insufficient") })
        return
      }
      await onSubmit({
        categoryId: selectedCat.id,
        categoryLabel: getCategoryLabel(selectedCat),
        amount: num,
        spentAt: spentDate,
        comment: comment || undefined,
        attachmentFile: file,
      })
      setAmount("")
      setComment("")
      setFile(null)
      setCategoryId(null)
      setConfirmOpen(false)
      setMessage({ type: "ok", text: t("fin_alloc_extra_toast_ok_desc") })
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

  function openConfirm() {
    if (!canSubmit) return
    setConfirmOpen(true)
  }

  return (
    <>
      {message ? (
        <div
          className={cn(
            "mb-4 rounded-xl border px-4 py-3 text-sm",
            message.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mb-4 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-4 py-3 text-sm">
        <p className="text-xs text-muted-foreground">{t("fin_alloc_available")}</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-900 dark:text-amber-100">
          {loading && !summary ? "…" : formatFcfa(summary?.remaining ?? 0)}
        </p>
        {accountName ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("fin_alloc_company_source")}: {accountName}
          </p>
        ) : null}
      </div>

      {walletField}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("mgr_pick_category")}</h2>
        <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin [scrollbar-width:thin]">
          {categories.map((c) => {
            const active = categoryId === c.id
            const isOther = c.id === "other"
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryClick(c.id)}
                className={cn(
                  "flex min-w-[132px] max-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border-2 bg-card p-4 text-center shadow-sm transition-all active:scale-[0.98]",
                  active && !isOther
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/80 hover:border-primary/35 hover:bg-muted/40",
                  isOther && "border-dashed",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl",
                    active && !isOther ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <ManagerCategoryIcon icon={c.icon} className="size-5" />
                </span>
                <span className="text-xs font-medium leading-tight text-balance">{getCategoryLabel(c)}</span>
              </button>
            )
          })}
        </div>

        <Card className="mt-6 border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("mgr_amount")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="extra-amt">{t("mgr_amount")}</Label>
                <Input
                  id="extra-amt"
                  type="number"
                  min={1}
                  max={summary && summary.remaining > 0 ? summary.remaining : undefined}
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn("h-11 rounded-xl", exceedsBudget && "border-destructive focus-visible:ring-destructive/30")}
                  aria-invalid={exceedsBudget}
                />
                {exceedsBudget && summary ? (
                  <p className="text-sm text-destructive">
                    {t("mgr_amount_exceeds_budget").replace("{remaining}", formatFcfa(summary.remaining))}
                  </p>
                ) : summary && !loading ? (
                  <p className="text-xs text-muted-foreground">
                    {t("mgr_amount_budget_hint").replace("{remaining}", formatFcfa(summary.remaining))}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra-date">{t("mgr_date")}</Label>
                <Input
                  id="extra-date"
                  type="date"
                  value={spentDate}
                  onChange={(e) => setSpentDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-com">{t("mgr_comment")}</Label>
              <Textarea
                id="extra-com"
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

        <div className="mt-6">
          <Button
            className="h-12 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/20 md:max-w-md"
            disabled={!canSubmit}
              onClick={() => openConfirm()}
          >
            {submitting ? t("mgr_submitting") : t("fin_alloc_extra_btn")}
          </Button>
        </div>
      </section>

      <ManagerCustomCategoryDialog
        open={otherDialogOpen}
        onOpenChange={setOtherDialogOpen}
        onAdd={handleAddCustomCategory}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fin_alloc_extra_confirm_title")}</DialogTitle>
            <DialogDescription>
              {selectedCat && parsedAmount
                ? t("fin_alloc_extra_confirm_desc")
                    .replace("{amount}", formatFcfa(parsedAmount))
                    .replace("{account}", accountName ?? "-")
                    .replace("{category}", getCategoryLabel(selectedCat))
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
              {t("fin_wallets_cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? t("mgr_submitting") : t("fin_alloc_extra_confirm_btn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
