import { getDashboardNavSections } from "@/components/sidebar-nav"
import { buildManagerScopedPayments } from "@/hooks/use-manager-payments"
import { canonicalAdminUserPhone } from "@/lib/admin-user-phone"
import { ClaimsService } from "@/services/claims.service"
import {
  getAdminClasses,
  getAdminLearners,
  getAdminPayments,
  getAdminUsers,
} from "@/services/admin-mock.service"
import type { TranslationKey } from "@/services/i18n"
import { ManagerLearnersService } from "@/services/manager-learners.service"
import type { ClaimRecord, ClaimStatus } from "@/services/claims.service"
import type { UserRole } from "@/types"

export type GlobalSearchGroupId =
  | "pages"
  | "learners"
  | "classes"
  | "payments"
  | "claims"
  | "users"

export interface GlobalSearchItem {
  id: string
  group: GlobalSearchGroupId
  title: string
  subtitle?: string
  href: string
  keywords: string
}

export type GlobalSearchTranslate = (key: TranslationKey) => string

const GROUP_ORDER: GlobalSearchGroupId[] = [
  "pages",
  "learners",
  "classes",
  "payments",
  "claims",
  "users",
]

const GROUP_LABEL_KEYS: Record<GlobalSearchGroupId, TranslationKey> = {
  pages: "global_search_group_pages",
  learners: "global_search_group_learners",
  classes: "global_search_group_classes",
  payments: "global_search_group_payments",
  claims: "global_search_group_claims",
  users: "global_search_group_users",
}

function joinKeywords(...parts: (string | number | undefined | null)[]): string {
  return parts
    .filter((p) => p !== undefined && p !== null && String(p).trim() !== "")
    .join(" ")
    .toLowerCase()
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`
}

function claimStatusKey(status: ClaimStatus): TranslationKey {
  switch (status) {
    case "en_attente":
      return "acc_claim_st_pending"
    case "en_cours":
      return "acc_claim_st_progress"
    case "resolue":
      return "acc_claim_st_resolved"
    case "rejetee":
      return "acc_claim_st_rejected"
    default:
      return "acc_claim_st_pending"
  }
}

function userRoleKey(role: "admin" | "manager" | "accountant" | "student"): TranslationKey {
  switch (role) {
    case "admin":
      return "adm_usr_role_admin"
    case "manager":
      return "adm_usr_role_manager"
    case "accountant":
      return "adm_usr_role_accountant"
    default:
      return "adm_usr_role_student"
  }
}

function pageItems(role: UserRole | null, t: GlobalSearchTranslate): GlobalSearchItem[] {
  const items: GlobalSearchItem[] = []
  const seen = new Set<string>()

  for (const section of getDashboardNavSections(role)) {
    for (const nav of section.items) {
      if (nav.isLogout || !nav.href || seen.has(nav.href)) continue
      seen.add(nav.href)
      const title = t(nav.labelKey)
      items.push({
        id: `page:${nav.href}`,
        group: "pages",
        title,
        href: nav.href,
        keywords: joinKeywords(title, nav.href, nav.labelKey),
      })
    }
  }

  const extras: { role: UserRole; key: TranslationKey; href: string }[] = [
    { role: "admin", key: "adm_learn_new", href: "/dashboard/admin/apprenants/nouveau" },
    { role: "admin", key: "adm_learn_import", href: "/dashboard/admin/apprenants/import" },
    { role: "admin", key: "adm_class_new_btn", href: "/dashboard/admin/classes/nouvelle" },
    { role: "manager", key: "adm_learn_new", href: "/dashboard/manager/apprenants/nouveau" },
    { role: "manager", key: "adm_learn_import", href: "/dashboard/manager/apprenants/import" },
    { role: "manager", key: "mgr_nav_new", href: "/dashboard/manager/depenses/nouvelle" },
    { role: "student", key: "sp_new_payment", href: "/dashboard/effectuer-paiement" },
  ]

  for (const extra of extras) {
    if (role !== extra.role) continue
    if (seen.has(extra.href)) continue
    seen.add(extra.href)
    const title = t(extra.key)
    items.push({
      id: `page:${extra.href}`,
      group: "pages",
      title,
      href: extra.href,
      keywords: joinKeywords(title, extra.href, extra.key),
    })
  }

  return items
}

function adminLearnerItems(t: GlobalSearchTranslate): GlobalSearchItem[] {
  const classes = getAdminClasses()
  const classNameById = new Map(classes.map((c) => [c.id, c.name]))

  return getAdminLearners().map((learner) => {
    const className = classNameById.get(learner.classId) ?? ""
    const title = learner.fullName
    const subtitle = [learner.phone, className].filter(Boolean).join(" · ")
    return {
      id: `learner:${learner.id}`,
      group: "learners" as const,
      title,
      subtitle,
      href: `/dashboard/admin/apprenants/${learner.id}`,
      keywords: joinKeywords(
        title,
        learner.phone,
        learner.id,
        className,
        learner.status,
      ),
    }
  })
}

function managerLearnerItems(): GlobalSearchItem[] {
  return ManagerLearnersService.getAll().map((learner) => ({
    id: `learner:${learner.id}`,
    group: "learners" as const,
    title: learner.fullName,
    subtitle: [learner.phone, learner.className].filter(Boolean).join(" · "),
    href: `/dashboard/manager/apprenants/${learner.id}`,
    keywords: joinKeywords(learner.fullName, learner.phone, learner.id, learner.className),
  }))
}

function adminClassItems(): GlobalSearchItem[] {
  return getAdminClasses().map((cls) => ({
    id: `class:${cls.id}`,
    group: "classes" as const,
    title: cls.name,
    subtitle: [cls.session, cls.status].filter(Boolean).join(" · "),
    href: `/dashboard/admin/classes/${cls.id}`,
    keywords: joinKeywords(cls.name, cls.session, cls.description, cls.id, cls.status),
  }))
}

function paymentItems(
  payments: { id: string; learnerId?: string; learnerName: string; className: string; amount: number; method: string; status: string; operatorReference?: string }[],
  learnerHref: (learnerId: string) => string,
  listHref: string,
): GlobalSearchItem[] {
  return payments.map((payment) => {
    const href = payment.learnerId ? learnerHref(payment.learnerId) : listHref
    const ref = payment.operatorReference ?? payment.id
    return {
      id: `payment:${payment.id}`,
      group: "payments" as const,
      title: payment.learnerName || ref,
      subtitle: [formatAmount(payment.amount), payment.className, payment.method, payment.status]
        .filter(Boolean)
        .join(" · "),
      href,
      keywords: joinKeywords(
        payment.learnerName,
        payment.className,
        payment.id,
        ref,
        payment.method,
        payment.status,
        payment.amount,
      ),
    }
  })
}

function claimItems(
  claims: ClaimRecord[],
  href: string,
  t: GlobalSearchTranslate,
): GlobalSearchItem[] {
  return claims.map((claim) => ({
    id: `claim:${claim.id}`,
    group: "claims" as const,
    title: claim.id,
    subtitle: [
      formatAmount(claim.amount),
      claim.transactionReference,
      t(claimStatusKey(claim.status)),
    ]
      .filter(Boolean)
      .join(" · "),
    href,
    keywords: joinKeywords(
      claim.id,
      claim.transactionReference,
      claim.phoneNumber,
      claim.description,
      claim.paymentMethod,
      claim.status,
      claim.amount,
    ),
  }))
}

function adminUserItems(t: GlobalSearchTranslate): GlobalSearchItem[] {
  return getAdminUsers()
    .filter((u) => u.role !== "student")
    .map((user) => ({
      id: `user:${user.id}`,
      group: "users" as const,
      title: user.fullName,
      subtitle: [user.phone, t(userRoleKey(user.role)), user.status].join(" · "),
      href: `/dashboard/admin/utilisateurs/${user.id}`,
      keywords: joinKeywords(
        user.fullName,
        user.phone,
        user.id,
        user.role,
        user.status,
        t(userRoleKey(user.role)),
      ),
    }))
}

function filterStudentClaims(claims: ClaimRecord[], phone: string | null | undefined): ClaimRecord[] {
  if (!phone?.trim()) return claims
  const key = canonicalAdminUserPhone(phone)
  if (!key) return claims
  return claims.filter((c) => canonicalAdminUserPhone(c.phoneNumber) === key)
}

/** Construit l'index de recherche pour le role connecte (donnees mock / localStorage). */
export function buildGlobalSearchIndex(
  role: UserRole | null,
  t: GlobalSearchTranslate,
  options?: { phone?: string | null },
): GlobalSearchItem[] {
  if (!role) return []

  const items: GlobalSearchItem[] = [...pageItems(role, t)]

  if (role === "admin") {
    items.push(...adminLearnerItems(t))
    items.push(...adminClassItems())
    items.push(
      ...paymentItems(
        getAdminPayments(),
        (id) => `/dashboard/admin/apprenants/${id}`,
        "/dashboard/admin/paiements",
      ),
    )
    items.push(...claimItems(ClaimsService.getAll(), "/dashboard/reclamations-validation", t))
    items.push(...adminUserItems(t))
  }

  if (role === "manager") {
    items.push(...managerLearnerItems())
    items.push(
      ...paymentItems(
        buildManagerScopedPayments(),
        (id) => `/dashboard/manager/apprenants/${id}`,
        "/dashboard/manager/paiements",
      ),
    )
    items.push(...claimItems(ClaimsService.getAll(), "/dashboard/reclamations-validation", t))
  }

  if (role === "accountant") {
    items.push(...claimItems(ClaimsService.getAll(), "/dashboard/comptable/reclamations", t))
  }

  if (role === "student") {
    const claims = filterStudentClaims(ClaimsService.getAll(), options?.phone)
    items.push(...claimItems(claims, "/dashboard/reclamations", t))
  }

  return items
}

export function groupGlobalSearchItems(
  items: GlobalSearchItem[],
  t: GlobalSearchTranslate,
): { group: GlobalSearchGroupId; label: string; items: GlobalSearchItem[] }[] {
  const buckets = new Map<GlobalSearchGroupId, GlobalSearchItem[]>()
  for (const item of items) {
    const list = buckets.get(item.group) ?? []
    list.push(item)
    buckets.set(item.group, list)
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((group) => ({
    group,
    label: t(GROUP_LABEL_KEYS[group]),
    items: buckets.get(group)!,
  }))
}
