"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  GraduationCap,
  Phone,
  Receipt,
  User,
} from "lucide-react"
import { ManagerLearnersService } from "@/domains/manager-learners"
import type { ManagedLearner, ManagerLearnerPayment, ManagerRecordedPaymentMethod } from "@/domains/manager-learners/types"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ManagerDeskPaymentDialog } from "@/components/manager/manager-desk-payment-dialog"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLocale } from "@/hooks/use-locale"
import { formatFcfa } from "@/lib/audit-date-range"

function sumPaid(l: ManagedLearner): number {
  return l.payments.reduce((s, p) => s + p.amount, 0)
}

function methodLabel(m: ManagerRecordedPaymentMethod): string {
  if (m === "cash") return "Especes"
  if (m === "mtn_momo") return "MTN Mobile Money"
  return "Orange Money"
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function ManagerLearnerDetailPage() {
  const params = useParams<{ id: string }>()
  const { t } = useLocale()
  const id = params?.id ?? ""

  const [learner, setLearner] = useState<ManagedLearner | null>(null)
  const [loadState, setLoadState] = useState<"loading" | "ok" | "missing">("loading")
  const [deskOpen, setDeskOpen] = useState(false)

  const refresh = useCallback(() => {
    const next = ManagerLearnersService.getById(id)
    if (!next) {
      setLearner(null)
      setLoadState("missing")
    } else {
      setLearner(next)
      setLoadState("ok")
    }
  }, [id])

  useEffect(() => {
    setLoadState("loading")
    refresh()
  }, [refresh])

  useEffect(() => {
    window.addEventListener("manager-learners-updated", refresh)
    return () => window.removeEventListener("manager-learners-updated", refresh)
  }, [refresh])

  const paymentsSorted = useMemo(() => {
    if (!learner) return []
    return [...learner.payments].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1))
  }, [learner])

  if (loadState === "loading") {
    return (
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/manager/apprenants" />
        <p className="mt-4 text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (loadState === "missing" || !learner) {
    return (
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/manager/apprenants" />
        <p className="mt-4 text-muted-foreground">Apprenant introuvable.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/manager/apprenants">Retour liste</Link>
        </Button>
      </div>
    )
  }

  const paid = sumPaid(learner)
  const reste = Math.max(0, learner.tuitionDue - paid)
  const ratio = learner.tuitionDue > 0 ? Math.min(100, Math.round((paid / learner.tuitionDue) * 100)) : 100
  const status = learner.status ?? "active"

  return (
    <div className="px-4 pb-10 pt-4 md:px-6 lg:px-8">
      <MobileBackButton fallbackHref="/dashboard/manager/apprenants" />
      <AdminPageHeader
        title={learner.fullName}
        subtitle={`Fiche apprenant · ${learner.id}`}
        gradientClassName="from-violet-600 to-fuchsia-600"
        actions={
          <Button variant="outline" size="sm" asChild className="border-primary-foreground/40 bg-white/10 text-primary-foreground hover:bg-white/20">
            <Link href="/dashboard/manager/apprenants">
              <ArrowLeft className="mr-2 size-4" />
              Liste
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identite</h2>
            <div className="flex flex-wrap gap-2">
              {reste > 0 ? (
                <Button size="sm" onClick={() => setDeskOpen(true)}>
                  <Banknote className="mr-2 size-3.5" />
                  {t("mgr_desk_pay")}
                </Button>
              ) : null}
            </div>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Nom</dt>
              <dd className="font-medium">{learner.fullName}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Telephone</dt>
              <dd className="font-mono">{learner.phone}</dd>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Classe</dt>
              <dd className="font-medium">{learner.className}</dd>
            </div>
            {learner.birthDate ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Date de naissance : </span>
                <span className="font-medium">{learner.birthDate}</span>
              </div>
            ) : null}
            <div className="text-sm">
              <span className="text-muted-foreground">Date d&apos;inscription : </span>
              <span className="font-medium">{formatDateTime(learner.enrolledAt)}</span>
            </div>
            {learner.notes ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes : </span>
                <span className="font-medium">{learner.notes}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {status === "active" ? (
                <Badge className="bg-emerald-500/15 text-emerald-800">Actif</Badge>
              ) : (
                <Badge variant="secondary">Suspendu</Badge>
              )}
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paiement (synthese)</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Du</span>
              <span className="font-semibold tabular-nums">{formatFcfa(learner.tuitionDue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paye</span>
              <span className="font-semibold tabular-nums text-emerald-700">{formatFcfa(paid)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Reste</span>
              <span className="font-bold tabular-nums text-rose-700">{formatFcfa(reste)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                style={{ width: `${ratio}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{ratio}% du du regle</p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Historique des paiements</h2>
            <span className="text-xs text-muted-foreground">({paymentsSorted.length})</span>
          </div>
          {reste > 0 ? (
            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setDeskOpen(true)}>
              <Banknote className="mr-2 size-3.5" />
              {t("mgr_desk_pay")}
            </Button>
          ) : null}
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aucun paiement enregistre pour cet apprenant.
                  </TableCell>
                </TableRow>
              ) : (
                paymentsSorted.map((p) => <PaymentRow key={p.id} p={p} />)
              )}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {paymentsSorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun paiement enregistre.</p>
          ) : (
            paymentsSorted.map((p) => (
              <div key={p.id} className="rounded-xl border bg-muted/20 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{formatDateTime(p.recordedAt)}</p>
                <p className="mt-1 font-semibold tabular-nums">{formatFcfa(p.amount)}</p>
                <p className="text-xs text-muted-foreground">{methodLabel(p.method)}</p>
                {p.note ? <p className="mt-1 text-xs text-muted-foreground">{p.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>

      <ManagerDeskPaymentDialog
        learner={learner}
        open={deskOpen}
        onClose={() => setDeskOpen(false)}
        onDone={refresh}
        t={t}
      />
    </div>
  )
}

function PaymentRow({ p }: { p: ManagerLearnerPayment }) {
  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">{formatDateTime(p.recordedAt)}</TableCell>
      <TableCell className="text-right tabular-nums font-medium">{formatFcfa(p.amount)}</TableCell>
      <TableCell>{methodLabel(p.method)}</TableCell>
      <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{p.note ?? "—"}</TableCell>
    </TableRow>
  )
}
