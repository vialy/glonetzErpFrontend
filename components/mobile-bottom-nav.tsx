"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  CreditCard,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Home,
  LayoutGrid,
  User,
  Wallet,
} from "lucide-react"
import type { UserRole } from "@/types"
import { cn } from "@/lib/utils"
import { useRouteLoader } from "@/components/route-loader"

interface MobileItem {
  label: string
  href: string
  icon: React.ReactNode
}

function itemsByRole(role: UserRole | null): MobileItem[] {
  if (role === "student") {
    return [
      { label: "Dashboard", href: "/dashboard", icon: <Home className="size-4" /> },
      { label: "Payer", href: "/dashboard/effectuer-paiement", icon: <CreditCard className="size-4" /> },
      { label: "Paiements", href: "/dashboard/mes-paiements", icon: <Wallet className="size-4" /> },
      { label: "Reclam.", href: "/dashboard/reclamations", icon: <AlertCircle className="size-4" /> },
      { label: "Profil", href: "/dashboard/mon-profil", icon: <User className="size-4" /> },
    ]
  }

  if (role === "manager") {
    return [
      { label: "Accueil", href: "/dashboard", icon: <Home className="size-4" /> },
      { label: "Élèves", href: "/dashboard/manager/apprenants", icon: <GraduationCap className="size-4" /> },
      { label: "Paiem.", href: "/dashboard/manager/paiements", icon: <CreditCard className="size-4" /> },
      { label: "Budget", href: "/dashboard/manager/budget", icon: <Wallet className="size-4" /> },
      { label: "Profil", href: "/dashboard/manager/profil", icon: <User className="size-4" /> },
    ]
  }

  if (role === "accountant") {
    return [
      { label: "Accueil", href: "/dashboard", icon: <Home className="size-4" /> },
      { label: "Flux", href: "/dashboard/comptable/flux", icon: <LayoutGrid className="size-4" /> },
      { label: "Rec.", href: "/dashboard/comptable/reclamations", icon: <AlertCircle className="size-4" /> },
      { label: "Rapp.", href: "/dashboard/comptable/rapports", icon: <FileBarChart className="size-4" /> },
      { label: "Profil", href: "/dashboard/comptable/profil", icon: <User className="size-4" /> },
    ]
  }

  if (role === "admin") {
    return [
      { label: "Dashboard", href: "/dashboard", icon: <Home className="size-4" /> },
      { label: "Classes", href: "/dashboard/admin/classes", icon: <GraduationCap className="size-4" /> },
      { label: "Paiements", href: "/dashboard/admin/paiements", icon: <CreditCard className="size-4" /> },
      { label: "Rapports", href: "/dashboard/admin/rapports", icon: <FileBarChart className="size-4" /> },
      { label: "Reclam.", href: "/dashboard/reclamations-validation", icon: <AlertCircle className="size-4" /> },
    ]
  }

  return [{ label: "Dashboard", href: "/dashboard", icon: <Home className="size-4" /> }]
}

export function MobileBottomNav({ role }: { role: UserRole | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { startLoading } = useRouteLoader()
  const items = itemsByRole(role)

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <nav
        className={cn(
          "mx-auto flex max-w-screen-sm items-stretch py-1.5",
          role === "manager"
            ? "justify-between gap-1 px-2"
            : role === "accountant"
              ? "justify-between gap-0.5 px-1"
              : "justify-around px-2 py-2"
        )}
      >
        {items.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              onClick={() => {
                startLoading()
                router.push(item.href)
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 font-medium transition-colors",
                role === "manager"
                  ? "text-[9px] leading-tight"
                  : role === "accountant"
                    ? "px-0.5 text-[9px] leading-tight"
                    : "min-w-14 gap-1 px-2 py-1 text-[11px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

