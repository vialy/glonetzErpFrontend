"use client"

import { ManagerLearnersService } from "@/domains/manager-learners"
import type { ManagedLearner } from "@/domains/manager-learners/types"
import { DeskPaymentDialog, type DeskPaymentTranslate } from "@/components/desk-payment/desk-payment-dialog"

export type ManagerDeskPaymentT = DeskPaymentTranslate

export function ManagerDeskPaymentDialog({
  learner,
  open,
  onClose,
  onDone,
  t,
}: {
  learner: ManagedLearner | null
  open: boolean
  onClose: () => void
  onDone: () => void
  t: ManagerDeskPaymentT
}) {
  const remaining = learner
    ? Math.max(learner.tuitionDue - learner.payments.reduce((s, p) => s + p.amount, 0), 0)
    : 0

  return (
    <DeskPaymentDialog
      open={open && !!learner}
      onClose={onClose}
      onSuccess={onDone}
      fullName={learner?.fullName ?? ""}
      remaining={remaining}
      onRecord={(amount, method, note) => {
        if (!learner) return
        ManagerLearnersService.recordDeskPayment(learner.id, amount, method, note)
      }}
      t={t}
    />
  )
}
