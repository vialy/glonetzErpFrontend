"use client"

import { useEffect, useMemo, useState } from "react"
import type { PaymentMethod } from "@/domains/payments/types"
import { accountingAuditService } from "@/domains/accounting"
import type { AuditDateRange, AuditExtraordinaryExpense, AuditManagerExpense, AuditPaymentReceived } from "@/domains/accounting/types"
import { defaultAuditDateRange, formatFcfa } from "@/lib/audit-date-range"
import { useLocale } from "@/hooks/use-locale"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ComptableFluxPage() {
  const { t } = useLocale()
  const methodLabel = useMemo(() => {
    return (m: PaymentMethod) => {
      if (m === "mtn_momo") return t("acc_method_mtn")
      if (m === "orange_money") return t("acc_method_om")
      return t("acc_method_cash")
    }
  }, [t])

  const [range, setRange] = useState<AuditDateRange>(() => defaultAuditDateRange())
  const [payments, setPayments] = useState<AuditPaymentReceived[]>([])
  const [manager, setManager] = useState<AuditManagerExpense[]>([])
  const [extra, setExtra] = useState<AuditExtraordinaryExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPayments(accountingAuditService.getPaymentsInRange(range))
    setManager(accountingAuditService.getManagerExpensesInRange(range))
    setExtra(accountingAuditService.getExtraordinaryInRange(range))
    setLoading(false)
  }, [range])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />
      <header className="mb-6 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("nav_acc_flow")}</p>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("acc_flow_title")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("acc_flow_subtitle")}</p>
      </header>

      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("acc_date_from")}</Label>
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("acc_date_to")}</Label>
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-11" />
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-3 h-9 px-2 text-xs" onClick={() => setRange(defaultAuditDateRange())}>
          {t("acc_reset_period")}
        </Button>
      </section>

      <Tabs defaultValue="in" className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-col gap-1 rounded-xl bg-muted/50 p-1 sm:inline-flex sm:w-auto sm:flex-row">
          <TabsTrigger value="in" className="min-h-10 flex-1 rounded-lg px-3 text-xs sm:text-sm">
            {t("acc_tab_in")}
            <span className="ml-1.5 tabular-nums text-muted-foreground">({payments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="mgr" className="min-h-10 flex-1 rounded-lg px-3 text-xs sm:text-sm">
            {t("acc_tab_manager")}
            <span className="ml-1.5 tabular-nums text-muted-foreground">({manager.length})</span>
          </TabsTrigger>
          <TabsTrigger value="ext" className="min-h-10 flex-1 rounded-lg px-3 text-xs sm:text-sm">
            {t("acc_tab_extra")}
            <span className="ml-1.5 tabular-nums text-muted-foreground">({extra.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="mt-0 outline-none">
          {loading ? (
            <FluxSkeleton />
          ) : payments.length === 0 ? (
            <Empty t={t} />
          ) : (
            <ul className="space-y-3">
              {payments.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{row.id}</p>
                      <p className="mt-1 font-medium">{row.studentName}</p>
                      <p className="text-sm text-muted-foreground">{row.className}</p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatFcfa(row.amount)}</p>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="inline">{t("acc_table_date")}: </dt>
                      <dd className="inline text-foreground">{formatWhen(row.recordedAt)}</dd>
                    </div>
                    <div>
                      <dt className="inline">{t("acc_table_method")}: </dt>
                      <dd className="inline text-foreground">{methodLabel(row.paymentMethod)}</dd>
                    </div>
                    {row.externalReference ? (
                      <div className="sm:col-span-2">
                        <dt className="inline">{t("acc_table_ref")}: </dt>
                        <dd className="inline font-mono text-foreground">{row.externalReference}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="mgr" className="mt-0 outline-none">
          {loading ? (
            <FluxSkeleton />
          ) : manager.length === 0 ? (
            <Empty t={t} />
          ) : (
            <ul className="space-y-3">
              {manager.map((row) => (
                <li key={row.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{row.id}</p>
                      <p className="mt-1 font-medium">{row.category}</p>
                      <p className="text-sm text-muted-foreground">{row.managerLabel}</p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-amber-800 dark:text-amber-400">{formatFcfa(row.amount)}</p>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>
                      <dt className="inline">{t("acc_table_date")}: </dt>
                      <dd className="inline text-foreground">{formatWhen(row.spentAt)}</dd>
                    </div>
                    {row.comment ? (
                      <div>
                        <dt className="inline">{t("acc_table_comment")}: </dt>
                        <dd className="inline text-foreground">{row.comment}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="ext" className="mt-0 outline-none">
          {loading ? (
            <FluxSkeleton />
          ) : extra.length === 0 ? (
            <Empty t={t} />
          ) : (
            <ul className="space-y-3">
              {extra.map((row) => (
                <li key={row.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{row.id}</p>
                      <p className="mt-1 font-medium">{row.description}</p>
                      {row.category ? <p className="text-sm text-muted-foreground">{row.category}</p> : null}
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-orange-800 dark:text-orange-400">{formatFcfa(row.amount)}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("acc_table_date")}: <span className="text-foreground">{formatWhen(row.spentAt)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FluxSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={`sk-${i}`}>
          <Skeleton className="h-28 w-full rounded-2xl" />
        </li>
      ))}
    </ul>
  )
}

function Empty({ t }: { t: (key: import("@/services/i18n").TranslationKey) => string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
      {t("acc_empty")}
    </div>
  )
}
