"use client"

import type {
  CreateStaffMemberInput,
  ListStaffMembersQuery,
  StaffMember,
  StaffMembersProvider,
  UpdateStaffMemberInput,
} from "@/domains/staff/types"

const STORAGE_KEY = "glonetz_admin_staff_v1"
const UPDATED_EVENT = "admin-staff-updated"

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "STF-ADMIN",
    fullName: "Super Admin",
    email: "admin@glonez.com",
    role: "admin",
    status: "active",
    mustChangePassword: false,
    createdAt: "2025-01-01T08:00:00.000Z",
  },
  {
    id: "STF-MANAGER",
    fullName: "Manager Centre",
    email: "manager@glonez.com",
    role: "manager",
    status: "active",
    mustChangePassword: false,
    createdAt: "2025-01-05T08:00:00.000Z",
  },
  {
    id: "STF-ACCOUNTANT",
    fullName: "Comptable Externe",
    email: "comptable@glonez.com",
    role: "accountant",
    status: "active",
    mustChangePassword: false,
    createdAt: "2025-01-06T08:00:00.000Z",
  },
]

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readStaff(): StaffMember[] {
  if (!canUseStorage()) return DEFAULT_STAFF.map((s) => ({ ...s }))
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_STAFF.map((s) => ({ ...s }))
  try {
    const parsed = JSON.parse(raw) as StaffMember[]
    return Array.isArray(parsed) ? parsed.map((s) => ({ ...s })) : DEFAULT_STAFF.map((s) => ({ ...s }))
  } catch {
    return DEFAULT_STAFF.map((s) => ({ ...s }))
  }
}

function writeStaff(next: StaffMember[]) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

function filterStaff(list: StaffMember[], query?: ListStaffMembersQuery) {
  let result = list
  if (query?.role) result = result.filter((item) => item.role === query.role)
  const q = query?.q?.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    )
  }
  return result
}

export const mockStaffMembersProvider: StaffMembersProvider = {
  async list(query) {
    return filterStaff(readStaff(), query)
  },

  async get(id) {
    return readStaff().find((item) => item.id === id) ?? null
  },

  async create(input: CreateStaffMemberInput) {
    const list = readStaff()
    const email = input.email.trim().toLowerCase()
    if (email && list.some((item) => item.email.trim().toLowerCase() === email)) {
      throw new Error("EMAIL_ALREADY_USED")
    }
    const member: StaffMember = {
      id: `STF-${Date.now()}`,
      fullName: input.name.trim(),
      email,
      role: input.role,
      status: "active",
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    }
    writeStaff([member, ...list])
    return { ...member, credentialsEmailSent: true }
  },

  async update(id: string, input: UpdateStaffMemberInput) {
    const list = readStaff()
    const idx = list.findIndex((item) => item.id === id)
    if (idx === -1) return null
    const prev = list[idx]
    const next: StaffMember = {
      ...prev,
      fullName: input.name !== undefined ? input.name.trim() : prev.fullName,
      role: input.role ?? prev.role,
    }
    const nextList = [...list]
    nextList[idx] = next
    writeStaff(nextList)
    return next
  },

  async setActive(id: string, active: boolean) {
    const list = readStaff()
    const idx = list.findIndex((item) => item.id === id)
    if (idx === -1) return null
    const next: StaffMember = { ...list[idx], status: active ? "active" : "inactive" }
    const nextList = [...list]
    nextList[idx] = next
    writeStaff(nextList)
    return next
  },

  async regeneratePassword(id: string) {
    const list = readStaff()
    const idx = list.findIndex((item) => item.id === id)
    if (idx === -1) return { credentialsEmailSent: true }
    const nextList = [...list]
    nextList[idx] = { ...nextList[idx], mustChangePassword: true }
    writeStaff(nextList)
    return { credentialsEmailSent: true }
  },
}
