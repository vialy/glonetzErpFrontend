"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type AreaChartPoint = {
  label: string
  in: number
  out: number
}

type AreaChartBlockProps = {
  data: AreaChartPoint[]
  formatValue: (value: number) => string
  inLabel: string
  outLabel: string
}

export function AreaChartBlock({ data, formatValue, inLabel, outLabel }: AreaChartBlockProps) {
  if (data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">—</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="admin-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="admin-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatValue(value),
            name === "in" ? inLabel : outLabel,
          ]}
        />
        <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} fill="url(#admin-in)" />
        <Area type="monotone" dataKey="out" stroke="#f59e0b" strokeWidth={2} fill="url(#admin-out)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
