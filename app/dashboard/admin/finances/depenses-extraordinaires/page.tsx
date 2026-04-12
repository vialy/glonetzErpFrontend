"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarRange, Download, Search, TrendingDown, Wallet } from "lucide-react"
import { adminExpenses, formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { useFinanceContext } from "../finance-context"

type ExtraRow = {
  id: string
  createdAt: string
  label: string
  amount: number
  walletId: string
  source: "session" | "seed"
}

export default function DepensesExtraordinairesPage() {
  const { operations, wallets } = useFinanceContext()
  const [walletFilter, setWalletFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const allRows = useMemo<ExtraRow[]>(() => {
    const fromOps: ExtraRow[] = operations
      .filter((op) => op.type === "extra_expense")
      .map((op) => ({
        id: op.id,
        createdAt: op.createdAt.slice(0, 10),
        label: op.label,
        amount: op.amount,
        walletId: op.walletId,
        source: "session",
      }))
    const fromSeed: ExtraRow[] = adminExpenses
      .filter((e) => e.type === "extra")
      .map((e) => ({
        id: `seed-${e.id}`,
        createdAt: e.createdAt.slice(0, 10),
        label: e.label,
        amount: e.amount,
        walletId: "w-tuition",
        source: "seed",
      }))
    return [...fromSeed, ...fromOps].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }, [operations])

  const filtered = useMemo(() => {
    return allRows.filter((row) => {
      if (walletFilter !== "all" && row.walletId !== walletFilter) return false
      if (dateFrom && row.createdAt < dateFrom) return false
      if (dateTo && row.createdAt > dateTo) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!row.label.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allRows, walletFilter, dateFrom, dateTo, query])

  const kpiTotal = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [walletFilter, dateFrom, dateTo, query])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function walletName(id: string) {
    return wallets.find((w) => w.id === id)?.name ?? id
  }

  function exportCsv() {
    if (filtered.length === 0) {
      toast({ title: "Aucune ligne", description: "Aucun résultat à exporter." })
      return
    }
    const header = "date,motif,montant,portefeuille,operation_id,source"
    const rows = filtered.map((r) =>
      [r.createdAt, r.label, String(r.amount), walletName(r.walletId), r.id, r.source]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `depenses-extraordinaires-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export CSV", description: `${filtered.length} ligne(s) exportée(s).` })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 px-4 py-4 text-white sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <TrendingDown className="size-5" />
                Dépenses extraordinaires
              </p>
              <p className="mt-1 max-w-2xl text-sm text-white/90">
                Historique des charges exceptionnelles enregistrées par l’administration (hors petite caisse manager). Filtrez
                par période et par portefeuille débité.
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/20"
            >
              <Download className="size-3.5" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t bg-muted/20 p-3 sm:grid-cols-3 sm:p-4">
          <div className="rounded-xl border border-white/10 bg-background/80 p-3 dark:bg-background/40">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lignes (filtre)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/80 p-3 dark:bg-background/40">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total FCFA</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatFcfa(kpiTotal)}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-3 sm:col-span-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarRange className="size-3.5" /> Période
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dateFrom || dateTo
                ? `${dateFrom || "…"} → ${dateTo || "…"}`
                : "Aucune borne — toutes les dates"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <p className="text-sm font-semibold">Filtres</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Portefeuille débité</span>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">Tous les portefeuilles</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Du</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Au</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="min-h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Recherche</span>
            <span className="relative flex">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Motif ou id opération…"
                className="min-h-10 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm shadow-sm"
              />
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> / {pageCount} ·{" "}
            <span className="font-medium text-foreground">{pageSize}</span> lignes
          </p>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-xl border bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-[1] border-b bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Motif</th>
                <th className="px-4 py-3">Portefeuille</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Réf.</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.id} className="border-b border-border/60 transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.createdAt}</td>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="size-3.5 shrink-0" />
                      {walletName(row.walletId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-800 dark:text-amber-400">
                    − {formatFcfa(row.amount)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.id}
                    {row.source === "seed" ? (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">démo</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {paged.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={5}>
                    Aucune dépense extraordinaire pour ces critères.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {paged.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune dépense extraordinaire pour ces critères.
          </div>
        ) : (
          paged.map((row) => (
            <div key={row.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.createdAt}</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-amber-800 dark:text-amber-400">− {formatFcfa(row.amount)}</p>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5" />
                {walletName(row.walletId)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.id}</p>
            </div>
          ))
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Pagination</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-9 flex-1 rounded-xl border bg-background px-3 text-xs font-semibold disabled:opacity-50 sm:flex-none"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="min-h-9 flex-1 rounded-xl border bg-background px-3 text-xs font-semibold disabled:opacity-50 sm:flex-none"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Astuce : les opérations créées dans cette session apparaissent avec leur id <code className="rounded bg-muted px-1">fo-…</code>
        . Les lignes marquées <span className="rounded bg-muted px-1 text-[10px] uppercase">démo</span> proviennent des données
        d’exemple initiales.
      </p>
    </div>
  )
}
