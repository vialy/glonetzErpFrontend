"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  CreditCard,
  FileBarChart,
  GraduationCap,
  Home,
  LayoutGrid,
  User,
  Wallet,
  School,
} from "lucide-react"
import type { UserRole } from "@/types"
import { cn } from "@/lib/utils"
import { useRouteLoader } from "@/components/route-loader"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

interface MobileItem {
  labelKey: TranslationKey
  href: string
  icon: React.ReactNode
}

function itemsByRole(role: UserRole | null): MobileItem[] {
  if (role === "manager") {
    return [
      { labelKey: "mob_mgr_home", href: "/dashboard", icon: <Home className="size-4" /> },
      { labelKey: "mob_mgr_learners", href: "/dashboard/manager/apprenants", icon: <GraduationCap className="size-4" /> },
      { labelKey: "mob_mgr_pay", href: "/dashboard/manager/paiements", icon: <CreditCard className="size-4" /> },
      { labelKey: "mob_mgr_claims", href: "/dashboard/reclamations-validation", icon: <AlertCircle className="size-4" /> },
      { labelKey: "mob_mgr_budget", href: "/dashboard/manager/budget", icon: <Wallet className="size-4" /> },
      { labelKey: "mob_mgr_profile", href: "/dashboard/manager/profil", icon: <User className="size-4" /> },
    ]
  }

  if (role === "accountant") {
    return [
      { labelKey: "mob_acc_home", href: "/dashboard", icon: <Home className="size-4" /> },
      { labelKey: "mob_acc_flow", href: "/dashboard/comptable/flux", icon: <LayoutGrid className="size-4" /> },
      { labelKey: "mob_acc_claims", href: "/dashboard/comptable/reclamations", icon: <AlertCircle className="size-4" /> },
      { labelKey: "mob_acc_rep", href: "/dashboard/comptable/rapports", icon: <FileBarChart className="size-4" /> },
      { labelKey: "mob_acc_profile", href: "/dashboard/comptable/profil", icon: <User className="size-4" /> },
    ]
  }

  if (role === "collaborateur") {
    return [
      { labelKey: "nav_learners", href: "/dashboard/collaborateur/apprenants", icon: <GraduationCap className="size-4" /> },
      { labelKey: "nav_classes", href: "/dashboard/collaborateur/classes", icon: <School className="size-4" /> },
      { labelKey: "nav_profile", href: "/dashboard/collaborateur/profil", icon: <User className="size-4" /> },
    ]
  }

  if (role === "admin") {
    return [
      { labelKey: "mob_adm_dash", href: "/dashboard", icon: <Home className="size-4" /> },
      { labelKey: "mob_adm_classes", href: "/dashboard/admin/classes", icon: <GraduationCap className="size-4" /> },
      { labelKey: "mob_adm_pay", href: "/dashboard/admin/paiements", icon: <CreditCard className="size-4" /> },
      { labelKey: "mob_adm_rep", href: "/dashboard/admin/rapports", icon: <FileBarChart className="size-4" /> },
      { labelKey: "mob_adm_claims", href: "/dashboard/reclamations-validation", icon: <AlertCircle className="size-4" /> },
    ]
  }

  return [{ labelKey: "mob_adm_dash", href: "/dashboard", icon: <Home className="size-4" /> }]
}

export function MobileBottomNav({ role }: { role: UserRole | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
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
              key={item.labelKey}
              type="button"
              onClick={() => {
                if (pathname === item.href) return
                startLoading(item.href)
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
              <span>{t(item.labelKey)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
