import type { TranslationKey } from "@/services/i18n"
import type { UserRole } from "@/types"

export function getProfileHref(role: UserRole | null): string {
  if (role === "manager") return "/dashboard/manager/profil"
  if (role === "accountant") return "/dashboard/comptable/profil"
  return "/dashboard/admin/parametres"
}

export type TopBarNotificationDef = {
  id: string
  href: string
  labelKey: TranslationKey
  count: number
}

export function getNotificationDefsForRole(
  role: UserRole | null,
  counts: { pendingClaims: number; pendingPayments: number },
): TopBarNotificationDef[] {
  const items: TopBarNotificationDef[] = []

  if (role === "admin" || role === "manager") {
    if (counts.pendingClaims > 0) {
      items.push({
        id: "claims",
        href: "/dashboard/reclamations-validation",
        labelKey: "topbar_notif_claims",
        count: counts.pendingClaims,
      })
    }
  }

  if (role === "accountant") {
    items.push({
      id: "claims_ro",
      href: "/dashboard/comptable/reclamations",
      labelKey: "topbar_notif_claims_view",
      count: 0,
    })
  }

  if (role === "admin" && counts.pendingPayments > 0) {
    items.push({
      id: "payments",
      href: "/dashboard/admin/paiements",
      labelKey: "topbar_notif_payments",
      count: counts.pendingPayments,
    })
  }

  return items
}
