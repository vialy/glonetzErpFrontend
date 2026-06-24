"use client"

import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ActionFeedbackStatus = "loading" | "success" | "error"

type ActionFeedbackOverlayProps = {
  open: boolean
  status: ActionFeedbackStatus
  message: string
  closeLabel?: string
  onClose?: () => void
}

export function ActionFeedbackOverlay({
  open,
  status,
  message,
  closeLabel = "OK",
  onClose,
}: ActionFeedbackOverlayProps) {
  const canClose = status !== "loading"
  const title =
    status === "loading" ? "Traitement en cours" : status === "success" ? "Operation reussie" : "Erreur"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && canClose) onClose?.()
      }}
    >
      <DialogContent
        className="sm:max-w-sm"
        showCloseButton={canClose}
        onPointerDownOutside={(event) => {
          if (status === "loading") event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (status === "loading") event.preventDefault()
        }}
      >
        <DialogHeader className="items-center gap-4 sm:text-center">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {status === "loading" ? <Loader2 className="size-10 animate-spin text-primary" aria-hidden /> : null}
            {status === "success" ? <CheckCircle2 className="size-10 text-emerald-600" aria-hidden /> : null}
            {status === "error" ? <XCircle className="size-10 text-destructive" aria-hidden /> : null}
            <DialogDescription className="text-sm leading-relaxed text-foreground">{message}</DialogDescription>
          </div>
        </DialogHeader>
        {canClose ? (
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {closeLabel}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
