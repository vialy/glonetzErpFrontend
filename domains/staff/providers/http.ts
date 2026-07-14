"use client"

import { apiRequest } from "@/core/api/client"
import {
  findStaffMemberByEmail,
  parseStaffCreateResponse,
  parseStaffMember,
  parseStaffMemberList,
  parseStaffRegeneratePasswordResponse,
  staffMemberFromCreateFallback,
  toCreateStaffBody,
  toUpdateStaffBody,
} from "@/domains/staff/staff-members-api-mapper"
import {
  STAFF_ROLE_TO_CODE,
  type CreateStaffMemberInput,
  type CreateStaffMemberResult,
  type ListStaffMembersQuery,
  type StaffMember,
  type StaffMembersProvider,
  type UpdateStaffMemberInput,
} from "@/domains/staff/types"

const STAFF_ENDPOINT = "/staff/staff"
// Fetch the whole list in as few round-trips as possible (each Render request ~400ms).
const FETCH_ALL_PAGE_SIZE = 100
const MAX_PAGES = 50

function staffPath(id: string) {
  return `${STAFF_ENDPOINT}/${encodeURIComponent(id)}`
}

function notifyStaffUpdated() {
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      window.dispatchEvent(new Event("admin-staff-updated"))
    }, 0)
  }
}

async function postCreateStaff(body: Record<string, unknown>) {
  return apiRequest<unknown>(STAFF_ENDPOINT, {
    method: "POST",
    body,
  })
}

async function fetchAllStaff(query: ListStaffMembersQuery = {}): Promise<StaffMember[]> {
  const pageSize = query.pageSize ?? FETCH_ALL_PAGE_SIZE
  let pageNum = query.pageNum ?? 1
  const all: StaffMember[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>(STAFF_ENDPOINT, {
      method: "GET",
      query: {
        pageNum,
        pageSize,
        q: query.q,
        role: query.role ? STAFF_ROLE_TO_CODE[query.role] : undefined,
      },
    })
    const batch = parseStaffMemberList(data)
    all.push(...batch)
    if (batch.length < pageSize) break
    pageNum += 1
  }

  return all
}

async function resolveCreatedStaff(
  input: CreateStaffMemberInput,
  data: unknown,
): Promise<CreateStaffMemberResult> {
  try {
    const { member, credentialsEmailSent } = parseStaffCreateResponse(data)
    return { ...member, credentialsEmailSent }
  } catch {
    let member = staffMemberFromCreateFallback(input, data)
    try {
      const listData = await apiRequest<unknown>(STAFF_ENDPOINT, {
        method: "GET",
        query: { pageNum: 1, pageSize: 10, q: input.email.trim() },
      })
      const found = findStaffMemberByEmail(parseStaffMemberList(listData), input.email)
      if (found) member = found
    } catch {
      // Creation succeeded server-side; the list lookup is best-effort.
    }
    const credentialsEmailSent =
      data && typeof data === "object" && "credentialsEmailSent" in data
        ? Boolean((data as Record<string, unknown>).credentialsEmailSent)
        : true
    return { ...member, credentialsEmailSent }
  }
}

export const httpStaffMembersProvider: StaffMembersProvider = {
  async list(query) {
    return fetchAllStaff(query)
  },

  async get(id) {
    try {
      const data = await apiRequest<unknown>(staffPath(id), { method: "GET" })
      return parseStaffMember(data)
    } catch {
      return null
    }
  },

  async create(input: CreateStaffMemberInput) {
    const body = toCreateStaffBody(input)
    const data = await postCreateStaff(body)
    const created = await resolveCreatedStaff(input, data)
    notifyStaffUpdated()
    return created
  },

  async update(id: string, input: UpdateStaffMemberInput) {
    const body = toUpdateStaffBody(input)
    if (Object.keys(body).length === 0) return this.get(id)
    const data = await apiRequest<unknown>(staffPath(id), { method: "PATCH", body })
    notifyStaffUpdated()
    try {
      return parseStaffMember(data)
    } catch {
      return this.get(id)
    }
  },

  async setActive(id: string, active: boolean) {
    // Routes dediees et auditables : PATCH /staff/staff/:id/enable | /disable.
    // Le backend applique une garde de hierarchie (pas soi-meme, pas un admin,
    // pas un role >= au sien) et ignore le corps de la requete.
    const action = active ? "enable" : "disable"
    const data = await apiRequest<unknown>(`${staffPath(id)}/${action}`, {
      method: "PATCH",
    })
    notifyStaffUpdated()
    try {
      return parseStaffMember(data)
    } catch {
      return this.get(id)
    }
  },

  async regeneratePassword(id: string) {
    const data = await apiRequest<unknown>(`${staffPath(id)}/regenerate-password`, {
      method: "POST",
      body: {},
    })
    return parseStaffRegeneratePasswordResponse(data)
  },
}
