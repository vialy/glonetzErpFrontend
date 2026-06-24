"use client"

import { apiRequest } from "@/core/api/client"
import {
  findStaffMemberByEmail,
  parseStaffMember,
  parseStaffMemberList,
  staffMemberFromCreateFallback,
  toCreateStaffBody,
  toUpdateStaffBody,
} from "@/domains/staff/staff-members-api-mapper"
import {
  STAFF_ROLE_TO_CODE,
  type CreateStaffMemberInput,
  type ListStaffMembersQuery,
  type StaffMember,
  type StaffMembersProvider,
  type UpdateStaffMemberInput,
} from "@/domains/staff/types"

const STAFF_ENDPOINT = "/staff/staff"
// Fetch the whole list in as few round-trips as possible (each Render request ~400ms).
const FETCH_ALL_PAGE_SIZE = 100
const MAX_PAGES = 50
// Like learner creation, the backend awaits the email gateway before responding,
// which can hang for tens of seconds. The account already exists by then, so we
// stop waiting and confirm via an email lookup to cap the perceived wait.
const CREATE_REQUEST_MS = 4_000

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
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), CREATE_REQUEST_MS)
  try {
    return await apiRequest<unknown>(STAFF_ENDPOINT, {
      method: "POST",
      body,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("CREATE_STAFF_TIMEOUT")
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
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
): Promise<StaffMember> {
  try {
    return parseStaffMember(data)
  } catch {
    let created = staffMemberFromCreateFallback(input, data)
    try {
      const listData = await apiRequest<unknown>(STAFF_ENDPOINT, {
        method: "GET",
        query: { pageNum: 1, pageSize: 10, q: input.email.trim() },
      })
      const found = findStaffMemberByEmail(parseStaffMemberList(listData), input.email)
      if (found) created = found
    } catch {
      // Creation succeeded server-side; the list lookup is best-effort.
    }
    return created
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
    let data: unknown
    try {
      data = await postCreateStaff(body)
    } catch (error) {
      if (error instanceof Error && error.message === "CREATE_STAFF_TIMEOUT") {
        const created = await resolveCreatedStaff(input, null)
        notifyStaffUpdated()
        return created
      }
      throw error
    }
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
    await apiRequest<void>(`${staffPath(id)}/regenerate-password`, {
      method: "POST",
      body: {},
    })
  },
}
