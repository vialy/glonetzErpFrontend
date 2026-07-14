import type { UserRole } from "@/types"

const MANAGER_LEVEL: UserRole[] = ["admin", "manager"]

export function canCreateLearner(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "manager" || role === "collaborateur"
}

export function canDeleteLearner(role: UserRole | null | undefined): boolean {
  return MANAGER_LEVEL.includes(role as UserRole)
}

export function canSuspendLearner(role: UserRole | null | undefined): boolean {
  return MANAGER_LEVEL.includes(role as UserRole)
}

export function canRecordDeskPayment(role: UserRole | null | undefined): boolean {
  return MANAGER_LEVEL.includes(role as UserRole)
}

export function canEditLearner(role: UserRole | null | undefined): boolean {
  return MANAGER_LEVEL.includes(role as UserRole)
}

export function canResetLearnerPassword(role: UserRole | null | undefined): boolean {
  return MANAGER_LEVEL.includes(role as UserRole)
}

export function canManageScholarships(role: UserRole | null | undefined): boolean {
  return role === "admin"
}

export function canViewClassBalances(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "collaborateur"
}

export function staffRoleBasePath(role: UserRole | null | undefined): string {
  if (role === "manager") return "/dashboard/manager"
  if (role === "collaborateur") return "/dashboard/collaborateur"
  return "/dashboard/admin"
}
