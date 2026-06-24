import type { TranslationKey } from "@/services/i18n"
import type { UserRole } from "@/types"

export type GuideStep = {
  id: string
  href: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
}

const STORAGE_KEY = "glonetz_getting_started_v1"

const ADMIN_STEPS: GuideStep[] = [
  {
    id: "admin_dashboard",
    href: "/dashboard",
    titleKey: "guide_admin_dash_title",
    descriptionKey: "guide_admin_dash_desc",
  },
  {
    id: "admin_learners",
    href: "/dashboard/admin/apprenants",
    titleKey: "guide_admin_learners_title",
    descriptionKey: "guide_admin_learners_desc",
  },
  {
    id: "admin_classes",
    href: "/dashboard/admin/classes",
    titleKey: "guide_admin_classes_title",
    descriptionKey: "guide_admin_classes_desc",
  },
  {
    id: "admin_payments",
    href: "/dashboard/admin/paiements",
    titleKey: "guide_admin_payments_title",
    descriptionKey: "guide_admin_payments_desc",
  },
  {
    id: "admin_claims",
    href: "/dashboard/reclamations-validation",
    titleKey: "guide_admin_claims_title",
    descriptionKey: "guide_admin_claims_desc",
  },
  {
    id: "admin_finances",
    href: "/dashboard/admin/finances",
    titleKey: "guide_admin_finances_title",
    descriptionKey: "guide_admin_finances_desc",
  },
  {
    id: "admin_reports",
    href: "/dashboard/admin/rapports",
    titleKey: "guide_admin_reports_title",
    descriptionKey: "guide_admin_reports_desc",
  },
  {
    id: "admin_users",
    href: "/dashboard/admin/utilisateurs",
    titleKey: "guide_admin_users_title",
    descriptionKey: "guide_admin_users_desc",
  },
  {
    id: "admin_settings",
    href: "/dashboard/admin/parametres",
    titleKey: "guide_admin_settings_title",
    descriptionKey: "guide_admin_settings_desc",
  },
]

const MANAGER_STEPS: GuideStep[] = [
  {
    id: "mgr_dashboard",
    href: "/dashboard",
    titleKey: "guide_mgr_dash_title",
    descriptionKey: "guide_mgr_dash_desc",
  },
  {
    id: "mgr_learners",
    href: "/dashboard/manager/apprenants",
    titleKey: "guide_mgr_learners_title",
    descriptionKey: "guide_mgr_learners_desc",
  },
  {
    id: "mgr_payments",
    href: "/dashboard/manager/paiements",
    titleKey: "guide_mgr_payments_title",
    descriptionKey: "guide_mgr_payments_desc",
  },
  {
    id: "mgr_claims",
    href: "/dashboard/reclamations-validation",
    titleKey: "guide_mgr_claims_title",
    descriptionKey: "guide_mgr_claims_desc",
  },
  {
    id: "mgr_expense_new",
    href: "/dashboard/manager/depenses/nouvelle",
    titleKey: "guide_mgr_expense_new_title",
    descriptionKey: "guide_mgr_expense_new_desc",
  },
  {
    id: "mgr_expenses",
    href: "/dashboard/manager/depenses",
    titleKey: "guide_mgr_expenses_title",
    descriptionKey: "guide_mgr_expenses_desc",
  },
  {
    id: "mgr_budget",
    href: "/dashboard/manager/budget",
    titleKey: "guide_mgr_budget_title",
    descriptionKey: "guide_mgr_budget_desc",
  },
  {
    id: "mgr_profile",
    href: "/dashboard/manager/profil",
    titleKey: "guide_mgr_profile_title",
    descriptionKey: "guide_mgr_profile_desc",
  },
]

const ACCOUNTANT_STEPS: GuideStep[] = [
  {
    id: "acc_dashboard",
    href: "/dashboard",
    titleKey: "guide_acc_dash_title",
    descriptionKey: "guide_acc_dash_desc",
  },
  {
    id: "acc_flow",
    href: "/dashboard/comptable/flux",
    titleKey: "guide_acc_flow_title",
    descriptionKey: "guide_acc_flow_desc",
  },
  {
    id: "acc_claims",
    href: "/dashboard/comptable/reclamations",
    titleKey: "guide_acc_claims_title",
    descriptionKey: "guide_acc_claims_desc",
  },
  {
    id: "acc_reports",
    href: "/dashboard/comptable/rapports",
    titleKey: "guide_acc_reports_title",
    descriptionKey: "guide_acc_reports_desc",
  },
  {
    id: "acc_profile",
    href: "/dashboard/comptable/profil",
    titleKey: "guide_acc_profile_title",
    descriptionKey: "guide_acc_profile_desc",
  },
]

export function getGuideStepsForRole(role: UserRole | null): GuideStep[] {
  if (role === "manager") return MANAGER_STEPS
  if (role === "accountant") return ACCOUNTANT_STEPS
  return ADMIN_STEPS
}

/** Une etape est validee quand l'utilisateur a visite la page (meme route que l'icone sidebar). */
export function isGuideStepVisited(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/"
  const target = href.replace(/\/$/, "") || "/"
  if (target === "/dashboard") return path === "/dashboard"
  return path === target || path.startsWith(`${target}/`)
}

type GuideProgressStore = Partial<Record<UserRole, string[]>>

function readStore(): GuideProgressStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GuideProgressStore) : {}
  } catch {
    return {}
  }
}

function writeStore(store: GuideProgressStore) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event("getting-started-updated"))
}

export function getStoredCompletedIds(role: UserRole | null): string[] {
  if (!role) return []
  return readStore()[role] ?? []
}

export function saveCompletedIds(role: UserRole, ids: string[]) {
  const store = readStore()
  store[role] = ids
  writeStore(store)
}

export function resetGuideProgress(role: UserRole) {
  const store = readStore()
  delete store[role]
  writeStore(store)
}
