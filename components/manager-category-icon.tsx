"use client"

import type { LucideIcon } from "lucide-react"
import {
  Droplets,
  GraduationCap,
  HandCoins,
  MoreHorizontal,
  Package,
  Truck,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react"
import type { ManagerCategoryOption } from "@/domains/manager-wallet/types"

const MAP: Record<ManagerCategoryOption["icon"], LucideIcon> = {
  Package,
  Zap,
  Droplets,
  Wifi,
  Wrench,
  Truck,
  GraduationCap,
  HandCoins,
  MoreHorizontal,
}

export function ManagerCategoryIcon({
  icon,
  className,
}: {
  icon: ManagerCategoryOption["icon"]
  className?: string
}) {
  const Cmp = MAP[icon] ?? MoreHorizontal
  return <Cmp className={className} />
}
