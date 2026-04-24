"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  GraduationCap,
  CreditCard,
  AlertCircle,
  User,
  Wallet,
  Users,
  School,
  Receipt,
  LineChart,
  ClipboardList,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useLocale } from "@/hooks/use-locale"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useRouteLoader } from "@/components/route-loader"
import type { TranslationKey } from "@/services/i18n"
import type { UserRole } from "@/types"

interface NavItemDef {
  labelKey: TranslationKey
  icon: React.ReactNode
  href?: string
  isLogout?: boolean
}

interface NavSectionDef {
  titleKey?: TranslationKey
  items: NavItemDef[]
}

const studentSections: NavSectionDef[] = [
  {
    items: [
      { labelKey: "nav_dashboard", icon: <LayoutDashboard className="size-4" />, href: "/dashboard" },
      { labelKey: "nav_make_payment", icon: <CreditCard className="size-4" />, href: "/dashboard/effectuer-paiement" },
      { labelKey: "nav_my_payments", icon: <Wallet className="size-4" />, href: "/dashboard/mes-paiements" },
      { labelKey: "nav_claims", icon: <AlertCircle className="size-4" />, href: "/dashboard/reclamations" },
      { labelKey: "nav_my_profile", icon: <User className="size-4" />, href: "/dashboard/mon-profil" },
    ],
  },
  {
    items: [{ labelKey: "nav_logout", icon: <LogOut className="size-4" />, isLogout: true }],
  },
]

const managerSections: NavSectionDef[] = [
  {
    items: [{ labelKey: "nav_dashboard", icon: <LayoutDashboard className="size-4" />, href: "/dashboard" }],
  },
  {
    titleKey: "nav_mgr_pedagogy",
    items: [
      { labelKey: "mgr_nav_learners", icon: <GraduationCap className="size-4" />, href: "/dashboard/manager/apprenants" },
      { labelKey: "mgr_nav_payments", icon: <CreditCard className="size-4" />, href: "/dashboard/manager/paiements" },
      { labelKey: "mgr_nav_claims_val", icon: <AlertCircle className="size-4" />, href: "/dashboard/reclamations-validation" },
    ],
  },
  {
    titleKey: "nav_mgr_section",
    items: [
      { labelKey: "mgr_nav_new", icon: <Receipt className="size-4" />, href: "/dashboard/manager/depenses/nouvelle" },
      { labelKey: "mgr_nav_list", icon: <ClipboardList className="size-4" />, href: "/dashboard/manager/depenses" },
      { labelKey: "nav_my_budget", icon: <Wallet className="size-4" />, href: "/dashboard/manager/budget" },
    ],
  },
  {
    items: [{ labelKey: "nav_profile", icon: <User className="size-4" />, href: "/dashboard/manager/profil" }],
  },
  {
    items: [{ labelKey: "nav_logout", icon: <LogOut className="size-4" />, isLogout: true }],
  },
]

const accountantSections: NavSectionDef[] = [
  {
    items: [{ labelKey: "nav_dashboard", icon: <LayoutDashboard className="size-4" />, href: "/dashboard" }],
  },
  {
    titleKey: "nav_acc_section",
    items: [
      { labelKey: "nav_acc_flow", icon: <Receipt className="size-4" />, href: "/dashboard/comptable/flux" },
      { labelKey: "nav_acc_claims_ro", icon: <AlertCircle className="size-4" />, href: "/dashboard/comptable/reclamations" },
      { labelKey: "nav_reports", icon: <LineChart className="size-4" />, href: "/dashboard/comptable/rapports" },
    ],
  },
  {
    items: [{ labelKey: "nav_profile", icon: <User className="size-4" />, href: "/dashboard/comptable/profil" }],
  },
  {
    items: [{ labelKey: "nav_logout", icon: <LogOut className="size-4" />, isLogout: true }],
  },
]

const adminSections: NavSectionDef[] = [
  {
    items: [{ labelKey: "nav_dashboard", icon: <LayoutDashboard className="size-4" />, href: "/dashboard" }],
  },
  {
    titleKey: "nav_block_business",
    items: [
      { labelKey: "nav_learners", icon: <GraduationCap className="size-4" />, href: "/dashboard/admin/apprenants" },
      { labelKey: "nav_classes", icon: <School className="size-4" />, href: "/dashboard/admin/classes" },
      { labelKey: "nav_payments", icon: <CreditCard className="size-4" />, href: "/dashboard/admin/paiements" },
      { labelKey: "nav_claims", icon: <AlertCircle className="size-4" />, href: "/dashboard/reclamations-validation" },
    ],
  },
  {
    titleKey: "nav_block_finance",
    items: [
      { labelKey: "nav_finances", icon: <Receipt className="size-4" />, href: "/dashboard/admin/finances" },
      { labelKey: "nav_reports", icon: <LineChart className="size-4" />, href: "/dashboard/admin/rapports" },
    ],
  },
  {
    titleKey: "nav_block_admin",
    items: [
      { labelKey: "nav_users", icon: <Users className="size-4" />, href: "/dashboard/admin/utilisateurs" },
      { labelKey: "nav_audit", icon: <ClipboardList className="size-4" />, href: "/dashboard/admin/audit" },
      { labelKey: "nav_settings", icon: <Settings className="size-4" />, href: "/dashboard/admin/parametres" },
    ],
  },
  {
    items: [{ labelKey: "nav_logout", icon: <LogOut className="size-4" />, isLogout: true }],
  },
]

function getSectionsByRole(role: UserRole | null): NavSectionDef[] {
  if (role === "student") return studentSections
  if (role === "manager") return managerSections
  if (role === "accountant") return accountantSections
  return adminSections
}

export function SidebarNav({
  className,
  onLogout,
  role,
}: {
  className?: string
  onLogout?: () => void
  role?: UserRole | null
}) {
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { startLoading } = useRouteLoader()
  const navSections = getSectionsByRole(role ?? null)

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Logo */}
      <div className="flex items-center justify-center px-4 pt-5 pb-3">
        <Image src="/images/logo.png" alt="Glonetz" width={160} height={60} className="h-16 w-auto brightness-0 invert" />
      </div>

      <div className="flex justify-end px-4 py-1">
        <ChevronUp className="size-3 text-muted-foreground" />
      </div>

      {/* Nav sections */}
      <ScrollArea className="flex-1 min-h-0 px-2">
        <nav className="flex flex-col gap-4 pb-4">
          {navSections.map((section) => (
            <div key={`${section.titleKey ?? "group"}-${section.items[0]?.labelKey ?? "empty"}`}>
              {section.titleKey ? (
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-primary">
                  {t(section.titleKey)}
                </p>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.labelKey}>
                    <button
                      onClick={() => {
                        if (item.isLogout) {
                          onLogout?.()
                          return
                        }
                        if (item.href) {
                          startLoading()
                          router.push(item.href)
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        item.href === "/dashboard" ? pathname === "/dashboard" && "bg-sidebar-accent text-sidebar-accent-foreground" : item.href && pathname.startsWith(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      {item.icon}
                      {t(item.labelKey)}
                    </button>
                  </li>
                ))}
              </ul>
              {section.titleKey ? <div className="mt-3 border-t border-sidebar-border/60" /> : null}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="flex justify-end px-4 py-1">
        <ChevronDown className="size-3 text-muted-foreground" />
      </div>

      {/* Language selector */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <LanguageSwitcher />
      </div>
    </div>
  )
}
