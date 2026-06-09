"use client"

import dynamic from "next/dynamic"

export const LazyAreaChart = dynamic(
  () => import("@/components/charts/area-chart-block").then((m) => m.AreaChartBlock),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/60" />,
  },
)
