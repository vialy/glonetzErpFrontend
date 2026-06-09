"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ManagerLearnerPayment } from "@/domains/manager-learners/types"
import { ManagerLearnersService } from "@/services/manager-learners.service"
import { getAdminPayments, type AdminPaymentItem } from "@/services/admin-mock.service"

function formatDeskRecordedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function deskPaymentToAdminItem(learnerId: string, fullName: string, className: string, p: ManagerLearnerPayment): AdminPaymentItem {
  const method: AdminPaymentItem["method"] =
    p.method === "orange_money" ? "Orange" : p.method === "cash" ? "Especes" : "MTN"
  const status: AdminPaymentItem["status"] = p.method === "cash" ? "manual" : "success"
  return {
    id: `mgr-${learnerId}-${p.id}`,
    learnerId,
    operatorReference: p.method === "cash" ? `CAISSE-${p.id.replace(/\D/g, "").slice(-6) || "DESK"}` : undefined,
    learnerName: fullName,
    className,
    amount: p.amount,
    method,
    createdAt: formatDeskRecordedAt(p.recordedAt),
    status,
    note: p.note,
  }
}

export function buildManagerScopedPayments(): AdminPaymentItem[] {
  const learners = ManagerLearnersService.getAll()
  const ids = new Set(learners.map((l) => l.id))
  const fromDesk = learners.flatMap((l) =>
    l.payments.map((p) => deskPaymentToAdminItem(l.id, l.fullName, l.className, p)),
  )
  const fromAdmin = getAdminPayments().filter((p) => p.learnerId && ids.has(p.learnerId))
  const merged = [...fromDesk, ...fromAdmin]
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return merged
}

/** Paiements rattaches aux apprenants du gestionnaire (guichet + lignes admin liees par learnerId). */
export function useManagerPayments(): AdminPaymentItem[] {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const onLearners = () => refresh()
    const onAdminPay = () => refresh()
    window.addEventListener("manager-learners-updated", onLearners)
    window.addEventListener("admin-payments-updated", onAdminPay)
    return () => {
      window.removeEventListener("manager-learners-updated", onLearners)
      window.removeEventListener("admin-payments-updated", onAdminPay)
    }
  }, [refresh])

  return useMemo(() => {
    void tick
    return buildManagerScopedPayments()
  }, [tick])
}
