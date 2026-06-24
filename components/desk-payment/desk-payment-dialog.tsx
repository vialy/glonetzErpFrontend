"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { ManagerRecordedPaymentMethod } from "@/domains/manager-learners/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatFcfa } from "@/lib/audit-date-range"
import type { TranslationKey } from "@/services/i18n"

export type DeskPaymentTranslate = (key: TranslationKey) => string

export type DeskPaymentDialogProps = {
  open: boolean
  onClose: () => void
  /** Appelé après enregistrement réussi (avant fermeture). */
  onSuccess: () => void
  fullName: string
  remaining: number
  /** Enregistre le versement ; doit lever `Error` avec message `OVERPAY` ou `INVALID_AMOUNT` si besoin. Peut etre asynchrone. */
  onRecord: (amount: number, method: ManagerRecordedPaymentMethod, note?: string) => void | Promise<void>
  t: DeskPaymentTranslate
}

/** Dialogue partagé admin / manager : versement guichet (espèces, MTN, Orange). */
export function DeskPaymentDialog({
  open,
  onClose,
  onSuccess,
  fullName,
  remaining,
  onRecord,
  t,
}: DeskPaymentDialogProps) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<ManagerRecordedPaymentMethod>("cash")
  const [note, setNote] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount("")
      setNote("")
      setMethod("cash")
      setErr(null)
      setSaving(false)
    }
  }, [open, fullName])

  async function submit() {
    setErr(null)
    setSaving(true)
    try {
      const n = Number(amount)
      await onRecord(n, method, note.trim() || undefined)
      onSuccess()
      onClose()
    } catch (e) {
      const c = e instanceof Error ? e.message : ""
      if (c === "OVERPAY") setErr(t("mgr_err_overpay"))
      else if (c === "INVALID_AMOUNT" || !c) setErr(t("mgr_err_amount"))
      else setErr(c)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 px-5 py-4 text-primary-foreground">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg text-white">{t("mgr_desk_pay_title")}</DialogTitle>
            <p className="text-sm text-white/85">
              {fullName} — {t("mgr_pay_left")}: {formatFcfa(remaining)}
            </p>
          </DialogHeader>
        </div>
        <div className="space-y-3 bg-card px-5 py-4">
          <div className="space-y-1.5">
            <Label>{t("mgr_desk_amount")}</Label>
            <Input className="h-11 rounded-xl" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("mgr_payment_method")}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as ManagerRecordedPaymentMethod)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("mgr_method_cash")}</SelectItem>
                <SelectItem value="mtn_momo">{t("mgr_method_mtn")}</SelectItem>
                <SelectItem value="orange_money">{t("mgr_method_om")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("mgr_desk_note")}</Label>
            <Input className="h-11 rounded-xl" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </div>
        <DialogFooter className="gap-2 border-t bg-muted/30 px-5 py-4 sm:gap-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>
            {t("btn_cancel")}
          </Button>
          <Button
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            onClick={() => void submit()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("mgr_desk_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
