"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatFcfa } from "@/services/admin-mock.service"
import { useFinanceContext } from "../finance-context"

export default function FinanceOverviewPage() {
  const { operations } = useFinanceContext()

  const trend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    const inOps = operations.filter((o) => o.type === "inflow").reduce((sum, o) => sum + o.amount, 0)
    const outOps = operations.filter((o) => o.type !== "inflow").reduce((sum, o) => sum + o.amount, 0)
    return months.map((month, idx) => ({
      month,
      in: 500000 + (idx === months.length - 1 ? inOps : 0),
      out: 180000 + (idx === months.length - 1 ? outOps : 0),
    }))
  }, [operations])

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <p className="mb-2 text-sm font-semibold">Evolution revenus vs charges (consolide)</p>
      <div className="h-60 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.03} /></linearGradient>
              <linearGradient id="out" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0.03} /></linearGradient>
            </defs>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatFcfa(value)} />
            <Area type="monotone" dataKey="in" stroke="#10b981" fill="url(#in)" />
            <Area type="monotone" dataKey="out" stroke="#f97316" fill="url(#out)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
