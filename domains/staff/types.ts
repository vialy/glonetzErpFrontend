/**
 * Staff members domain — admin/manager/accountant accounts (NOT students).
 *
 * Backend endpoints (admin-only): `/staff/staff*`. Credentials are delivered by
 * EMAIL (unlike learners, who use phone), so a staff member always has an email.
 */

export type StaffRole = "admin" | "manager" | "accountant" | "support"

export type StaffStatus = "active" | "inactive"

export interface StaffMember {
  /** Friendly id (e.g. STF...) used by the API for lookups. */
  id: string
  fullName: string
  email: string
  role: StaffRole
  status: StaffStatus
  /** True when the member must change their password on next login. */
  mustChangePassword: boolean
  createdAt?: string
}

export interface CreateStaffMemberInput {
  name: string
  email: string
  /** Only `manager`, `accountant` and `support` can be created by the API. */
  role: StaffRole
}

export interface UpdateStaffMemberInput {
  name?: string
  /** Only `manager`, `accountant` and `support` are accepted by the API (not `admin`). */
  role?: StaffRole
}

export interface ListStaffMembersQuery {
  q?: string
  role?: StaffRole
  pageNum?: number
  pageSize?: number
}

export interface StaffMembersProvider {
  list(query?: ListStaffMembersQuery): Promise<StaffMember[]>
  get(id: string): Promise<StaffMember | null>
  create(input: CreateStaffMemberInput): Promise<StaffMember>
  update(id: string, input: UpdateStaffMemberInput): Promise<StaffMember | null>
  /** Active/desactive via les routes dediees PATCH /staff/staff/:id/enable|disable. */
  setActive(id: string, active: boolean): Promise<StaffMember | null>
  regeneratePassword(id: string): Promise<void>
}

/** Frontend role -> backend numeric code (see backend STAFF_ROLES). */
export const STAFF_ROLE_TO_CODE: Record<StaffRole, number> = {
  admin: 1000,
  manager: 600,
  accountant: 500,
  support: 200,
}

/**
 * Roles an admin can actually create through the UI. The backend rejects
 * creating another `admin`, and `support` accounts cannot log into this app
 * (the login role mapper only knows admin/manager/accountant), so we expose
 * manager + accountant only.
 */
export const CREATABLE_STAFF_ROLES: StaffRole[] = ["manager", "accountant"]
