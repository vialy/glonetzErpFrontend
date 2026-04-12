"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  Banknote,
  CalendarDays,
  GraduationCap,
  History,
  Phone,
  User,
  Wallet,
} from "lucide-react"
import { ManagerLearnersService } from "@/domains/manager-learners"
import type { ManagedLearner, ManagerLearnerPayment, ManagerRecordedPaymentMethod } from "@/domains/manager-learners/types"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
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
import { cn } from "@/lib/utils"

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

  const paid = learner ? sumPaid(learner) : 0
  const remaining = learner ? Math.max(learner.tuitionDue - paid, 0) : 0
  const ratio = learner && learner.tuitionDue > 0 ? Math.min(100, Math.round((paid / learner.tuitionDue) * 100)) : learner ? 100 : 0

  const paymentsSorted = useMemo(() => {
    if (!learner) return []
    return [...learner.payments].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1))
  }, [learner])

  if (loadState === "loading") {
    return (
      <div className="flex min-h-0 flex-col px-4 pt-4 pb-28 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/manager/apprenants" />
        <p className="mt-6 text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (loadState === "missing" || !learner) {
    return (
      <div className="flex min-h-0 flex-col px-4 pt-4 pb-28 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/manager/apprenants" />
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="font-medium text-foreground">Apprenant introuvable</p>
          <p className="mt-2 text-sm text-muted-foreground">Cet identifiant ne correspond a aucun profil.</p>
          <Button type="button" className="mt-6 rounded-xl" variant="outline" asChild>
            <Link href="/dashboard/manager/apprenants">Retour a la liste</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-28 md:px-6 md:pb-10 lg:px-8">
        <MobileBackButton fallbackHref="/dashboard/manager/apprenants" />
        <AdminPageHeader
          title={learner.fullName}
          subtitle={`${learner.className} · ${learner.id}`}
          gradientClassName="from-violet-600 via-fuchsia-600 to-rose-600"
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/manager/apprenants"
                className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur hover:bg-white/20"
              >
                Liste apprenants
              </Link>
              {remaining > 0 ? (
                <button
                  type="button"
                  onClick={() => setDeskOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-white"
                >
                  <Banknote className="size-3.5" />
                  {t("mgr_desk_pay")}
                </button>
              ) : null}
            </div>
          }
        />

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Situation financiere</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard
              label="Pension (du)"
              value={formatFcfa(learner.tuitionDue)}
              hint="Montant de la pension"
              icon={<Wallet className="size-4 text-violet-600" />}
            />
            <AdminKpiCard
              label="Deja paye"
              value={formatFcfa(paid)}
              hint={learner.tuitionDue > 0 ? `${ratio}% du du` : "—"}
              icon={<GraduationCap className="size-4 text-emerald-600" />}
            />
            <AdminKpiCard
              label="Reste"
              value={formatFcfa(remaining)}
              hint={remaining <= 0.01 ? "Solde regle" : "A encaisser"}
              icon={<Wallet className="size-4 text-rose-600" />}
            />
            <AdminKpiCard
              label="Versements"
              value={String(paymentsSorted.length)}
              hint="Lignes dans l'historique"
              icon={<History className="size-4 text-fuchsia-600" />}
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md">
          <div className="border-b border-border/60 bg-gradient-to-r from-slate-900 via-violet-900 to-fuchsia-900 px-4 py-3.5 sm:px-5">
            <p className="text-sm font-semibold text-white">Informations</p>
            <p className="mt-0.5 text-xs text-white/75">Coordonnees et dates liees au dossier.</p>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <DetailRow icon={<User className="size-4" />} label="Identifiant" value={learner.id} mono />
            <DetailRow icon={<Phone className="size-4" />} label="Telephone" value={learner.phone} />
            <DetailRow icon={<GraduationCap className="size-4" />} label="Classe" value={learner.className} />
            <DetailRow icon={<CalendarDays className="size-4" />} label="Inscription" value={formatDateTime(learner.enrolledAt)} />
            {learner.birthDate ? (
              <DetailRow icon={<CalendarDays className="size-4" />} label="Naissance" value={learner.birthDate} />
            ) : null}
            {learner.notes ? (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm leading-relaxed">{learner.notes}</p>
              </div>
            ) : null}
          </div>
          <div className="border-t border-border/60 px-4 py-3 sm:px-6">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                style={{ width: `${ratio}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Progression du reglement : {ratio}% · {remaining > 0.01 ? `reste ${formatFcfa(remaining)}` : "solde regle"}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2">
              <History className="size-5 text-violet-600" />
              <div>
                <p className="text-sm font-semibold">Historique des paiements</p>
                <p className="text-xs text-muted-foreground">Encaissements enregistres (plus recents en premier).</p>
              </div>
            </div>
            {remaining > 0 ? (
              <Button type="button" size="sm" className="rounded-xl" variant="outline" onClick={() => setDeskOpen(true)}>
                {t("mgr_desk_pay")}
              </Button>
            ) : null}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun paiement enregistre pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentsSorted.map((p) => <PaymentRow key={p.id} p={p} />)
                )}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-2 p-4 md:hidden">
            {paymentsSorted.length === 0 ? (
              <li className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Aucun paiement.</li>
            ) : (
              paymentsSorted.map((p) => (
                <li key={p.id} className="rounded-xl border border-border/60 bg-gradient-to-b from-background to-muted/15 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{formatDateTime(p.recordedAt)}</p>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {methodLabel(p.method)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatFcfa(p.amount)}</p>
                  {p.note ? <p className="mt-1 text-xs text-muted-foreground">{p.note}</p> : null}
                </li>
              ))
            )}
          </ul>
        </div>

        <ManagerDeskPaymentDialog
          learner={learner}
          open={deskOpen}
          onClose={() => setDeskOpen(false)}
          onDone={refresh}
          t={t}
        />
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/50 bg-muted/15 p-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 text-sm font-medium text-foreground", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  )
}

function PaymentRow({ p }: { p: ManagerLearnerPayment }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{formatDateTime(p.recordedAt)}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatFcfa(p.amount)}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          {methodLabel(p.method)}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{p.note ?? "—"}</TableCell>
    </TableRow>
  )
}
