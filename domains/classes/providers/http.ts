"use client"

import { apiRequest } from "@/core/api/client"
import {
  parseStaffClass,
  parseStaffClassDetails,
  parseStaffClassList,
  toCreateClassBody,
} from "@/domains/classes/classes-api-mapper"
import type {
  ClassesProvider,
  CreateStaffClassInput,
  ListStaffClassesQuery,
  StaffClass,
  UpdateStaffClassInput,
} from "@/domains/classes/types"

// Use the backend's max page size when fetching the full list so we make as
// few round-trips as possible (each request is ~300-400ms on Render).
const FETCH_ALL_PAGE_SIZE = 100
const MAX_PAGES = 50

function toUpdateClassBody(input: UpdateStaffClassInput) {
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.title = input.name.trim()
  if (input.description !== undefined) body.description = input.description.trim()
  if (input.periodStart !== undefined) body.startDate = input.periodStart
  if (input.periodEnd !== undefined) body.endDate = input.periodEnd
  if (input.tuitionAmount !== undefined) body.fee = Math.round(input.tuitionAmount)
  return body
}

async function fetchAllClasses(query: ListStaffClassesQuery = {}) {
  const pageSize = query.pageSize ?? FETCH_ALL_PAGE_SIZE
  let pageNum = query.pageNum ?? 1
  const all: StaffClass[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>("/staff/classes", {
      method: "GET",
      query: {
        pageNum,
        pageSize,
        q: query.q,
      },
    })
    const batch = parseStaffClassList(data)
    all.push(...batch)
    if (batch.length < pageSize) break
    pageNum += 1
  }

  return all
}

export const httpClassesProvider: ClassesProvider = {
  async list(query) {
    return fetchAllClasses(query)
  },

  async get(id) {
    try {
      const data = await apiRequest<unknown>(`/staff/classes/${encodeURIComponent(id)}`, {
        method: "GET",
      })
      return parseStaffClass(data)
    } catch {
      return null
    }
  },

  async getDetails(id) {
    try {
      const data = await apiRequest<unknown>(`/staff/classes/${encodeURIComponent(id)}/details`, {
        method: "GET",
      })
      return parseStaffClassDetails(data)
    } catch {
      return null
    }
  },

  async create(input: CreateStaffClassInput) {
    const locale = input.locale ?? "fr"
    const data = await apiRequest<unknown>("/staff/classes", {
      method: "POST",
      body: toCreateClassBody(input),
    })
    const created = parseStaffClass(data, locale)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("admin-classes-updated"))
    }
    return created
  },

  async update(id: string, input: UpdateStaffClassInput) {
    const locale = input.locale ?? "fr"
    const body = toUpdateClassBody(input)
    if (Object.keys(body).length === 0) {
      return this.get(id)
    }
    const data = await apiRequest<unknown>(`/staff/classes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    })
    const updated = parseStaffClass(data, locale)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("admin-classes-updated"))
    }
    return updated
  },
}
