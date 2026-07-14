"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
import type { ScholarshipType } from "@/services/scholarships.service"
import type { TranslationKey } from "@/services/i18n"

type ScholarshipDialogProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  fullName: string
  catalogFee: number
  onGrant: (type: ScholarshipType, value: number | undefined, reason?: string) => Promise<void>
  t: (key: TranslationKey) => string
}

export function ScholarshipDialog({
  open,
  onClose,
  onSuccess,
  fullName,
  catalogFee,
  onGrant,
  t,
}: ScholarshipDialogProps) {
  const [type, setType] = useState<ScholarshipType>("full")
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType("full")
      setValue("")
      setReason("")
      setErr(null)
      setSaving(false)
    }
  }, [open, fullName])

  async function submit() {
    setErr(null)
    setSaving(true)
    try {
      const n = type === "full" ? undefined : Number(value)
      if (type !== "full" && (!Number.isFinite(n) || (n ?? 0) <= 0)) {
        setErr(t("sch_err_amount"))
        return
      }
      if (type === "fixed" && n != null && n > catalogFee) {
        setErr(t("sch_err_exceeds_fee"))
        return
      }
      if (type === "percentage" && n != null && n > 100) {
        setErr(t("sch_err_percent"))
        return
      }
      await onGrant(type, n, reason.trim() || undefined)
      onSuccess()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("sch_err_generic"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-5 py-4 text-primary-foreground">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg text-white">{t("sch_dialog_title")}</DialogTitle>
            <p className="text-sm text-white/85">
              {fullName} — {t("sch_catalog_fee")}: {formatFcfa(catalogFee)}
            </p>
          </DialogHeader>
        </div>
        <div className="space-y-3 bg-card px-5 py-4">
          <div className="space-y-1.5">
            <Label>{t("sch_type_label")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as ScholarshipType)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{t("sch_type_full")}</SelectItem>
                <SelectItem value="fixed">{t("sch_type_fixed")}</SelectItem>
                <SelectItem value="percentage">{t("sch_type_percent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type !== "full" ? (
            <div className="space-y-1.5">
              <Label>{type === "percentage" ? t("sch_percent_label") : t("sch_amount_label")}</Label>
              <Input
                className="h-11 rounded-xl"
                type="number"
                min={1}
                max={type === "percentage" ? 100 : catalogFee}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>{t("sch_reason_label")}</Label>
            <Input className="h-11 rounded-xl" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </div>
        <DialogFooter className="gap-2 border-t bg-muted/30 px-5 py-4 sm:gap-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>
            {t("btn_cancel")}
          </Button>
          <Button
            className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500"
            onClick={() => void submit()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("sch_grant_btn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
