"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/hooks/use-locale"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (label: string) => Promise<void>
}

export function ManagerCustomCategoryDialog({ open, onOpenChange, onAdd }: Props) {
  const { t } = useLocale()
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setLabel("")
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (saving) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSubmit() {
    const trimmed = label.trim()
    if (trimmed.length < 2) {
      setError(t("mgr_cat_other_name_min"))
      return
    }
    if (trimmed.length > 80) {
      setError(t("mgr_cat_other_name_max"))
      return
    }
    setSaving(true)
    try {
      await onAdd(trimmed)
      reset()
      onOpenChange(false)
    } catch {
      setError(t("mgr_cat_other_create_failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mgr_cat_other_modal_title")}</DialogTitle>
          <DialogDescription>{t("mgr_cat_other_modal_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="mgr-custom-category">{t("mgr_cat_other_name_label")}</Label>
          <Input
            id="mgr-custom-category"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              if (error) setError(null)
            }}
            placeholder={t("mgr_cat_other_name_ph")}
            maxLength={80}
            autoFocus
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSubmit()
              }
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={saving} onClick={() => handleOpenChange(false)}>
            {t("mgr_cat_other_cancel")}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
            {t("mgr_cat_other_add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
