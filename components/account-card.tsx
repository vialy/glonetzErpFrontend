"use client"

import { FileText, Link2 } from "lucide-react"

interface AccountCardProps {
  initials: string
  name: string
  amount: string
  currency: string
  transactions: number
  lastSync: string
}

export function AccountCard({
  initials,
  name,
  amount,
  currency,
  transactions,
  lastSync,
}: AccountCardProps) {
  return (
    <button className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.98]">
      {/* Colored top strip */}
      <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />

      <div className="flex flex-col p-4">
        {/* Header with initials and name */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">{initials}</span>
          </div>
          <span className="text-base font-semibold text-foreground">{name}</span>
        </div>

        {/* Amount */}
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-primary">{amount}</span>
          <span className="text-sm font-medium text-muted-foreground">{currency}</span>
        </div>

        {/* Footer with transactions and sync */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            <span>{transactions}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link2 className="size-3.5" />
            <span>{lastSync}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
