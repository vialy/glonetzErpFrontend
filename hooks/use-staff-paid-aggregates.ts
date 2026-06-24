"use client"

import { useMemo } from "react"
import { useAdminPaymentsQuery } from "@/hooks/use-admin-payments"

/**
 * Source unique pour l'encaisse cote staff : on agrege les paiements reels
 * (GET /staff/payments) par apprenant ET par classe a partir des memes lignes,
 * afin que les chiffres soient coherents partout (somme par classe == somme par
 * apprenant == total encaisse). Seuls les paiements reellement encaisses sont
 * comptes : `success` (passerelle) et `manual` (saisie manuelle). Les `pending`
 * et echoues ne sont jamais consideres comme payes.
 */
export function useStaffPaidAggregates(): {
  paidByLearner: Record<string, number>
  paidByClass: Record<string, number>
  totalPaid: number
  loading: boolean
} {
  const { payments, loading } = useAdminPaymentsQuery()

  return useMemo(() => {
    const paidByLearner: Record<string, number> = {}
    const paidByClass: Record<string, number> = {}
    let totalPaid = 0

    for (const p of payments) {
      if (p.status !== "success" && p.status !== "manual") continue
      totalPaid += p.amount
      if (p.learnerId) paidByLearner[p.learnerId] = (paidByLearner[p.learnerId] ?? 0) + p.amount
      if (p.classId) paidByClass[p.classId] = (paidByClass[p.classId] ?? 0) + p.amount
    }

    return { paidByLearner, paidByClass, totalPaid, loading }
  }, [payments, loading])
}
