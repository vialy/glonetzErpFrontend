"use client"

import { useState } from "react"
import { FileDown, FileText, Table2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

export default function AdminReportsPage() {
  const [message, setMessage] = useState("")

  function downloadSample(type: "pdf" | "excel", title: string) {
    const now = new Date().toISOString().slice(0, 10)
    if (type === "excel") {
      const csv = `Type,Periode,Montant\n${title},${now},1250000\n`
      const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${now}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } else {
      const content = `Rapport ${title}\nPeriode: ${now}\n\nDocument de demonstration front-end.`
      const blob = new Blob([content], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${now}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    }
    const msg = `Export ${type.toUpperCase()} lance pour "${title}".`
    setMessage(msg)
    toast({ title: "Export genere", description: msg })
  }

  const cards = [
    { title: "Rapport paiements par classe", desc: "Dû / paye / reste sur la periode choisie.", icon: <Table2 className="size-4" /> },
    { title: "Rapport des charges", desc: "Manager + depenses extraordinaires.", icon: <FileText className="size-4" /> },
    { title: "Bilan simplifie", desc: "Revenus, charges, resultat net theorique.", icon: <FileDown className="size-4" /> },
  ]

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader title="Rapports & exports" subtitle="Generer et telecharger les exports PDF / Excel pour la direction et la comptabilite." gradientClassName="from-fuchsia-600 to-indigo-600" />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">{c.icon}</div>
            <p className="mt-3 text-sm font-semibold">{c.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => downloadSample("pdf", c.title)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Export PDF</button>
              <button onClick={() => downloadSample("excel", c.title)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Export Excel</button>
            </div>
          </div>
        ))}
      </div>
      {message ? <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
      <div className="mt-4 rounded-xl border bg-card p-4 text-sm text-muted-foreground">Ces boutons sont prets pour etre branches a ton backend de generation (CSV, XLSX, PDF).</div>
    </div>
  )
}

