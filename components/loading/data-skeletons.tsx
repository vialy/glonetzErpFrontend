import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function KpiCardsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={`kpi-sk-${i}`} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-7 w-28" />
        </div>
      ))}
    </div>
  )
}

export function KpiCardsLargeSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={`kpi-lg-sk-${i}`} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-xl" />
          </div>
          <Skeleton className="mt-3 h-3 w-full max-w-[200px]" />
        </div>
      ))}
    </div>
  )
}

export function CardListSkeleton({
  count = 4,
  height = "h-20",
  className,
}: {
  count?: number
  height?: string
  className?: string
}) {
  return (
    <ul className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={`card-sk-${i}`}>
          <Skeleton className={cn("w-full rounded-xl", height)} />
        </li>
      ))}
    </ul>
  )
}

export function ExpenseCardListSkeleton({ count = 4 }: { count?: number }) {
  return <CardListSkeleton count={count} height="h-24" />
}

export function AccountCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-row flex-wrap gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`acct-sk-${i}`} className="min-w-[min(100%,280px)] flex-1 basis-[280px]">
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  )
}

export function TableRowsSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={`row-sk-${r}`} className="border-t">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={`cell-sk-${r}-${c}`} className="px-4 py-3">
              <Skeleton
                className={cn(
                  "h-4",
                  c === cols - 1 ? "ml-auto w-20" : c === 0 ? "w-32" : "w-full max-w-[120px]",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function DetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 px-4 py-6 md:px-6", className)}>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`detail-sk-${i}`} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function FormSectionSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-2/3 rounded-xl" />
    </div>
  )
}

export function FinanceStatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`fin-stat-sk-${i}`} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function InlineFieldSkeleton({ width = "w-48" }: { width?: string }) {
  return <Skeleton className={cn("h-11 rounded-xl", width)} />
}
