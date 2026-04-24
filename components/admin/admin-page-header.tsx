"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  bottomContent,
  className,
  gradientClassName,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
  bottomContent?: ReactNode
  className?: string
  gradientClassName?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl text-primary-foreground shadow-lg",
        "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600",
        gradientClassName,
        className
      )}
    >
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-bold md:text-2xl text-balance">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-primary-foreground/85">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {bottomContent ? <div className="mt-4">{bottomContent}</div> : null}
      </div>
    </div>
  )
}

