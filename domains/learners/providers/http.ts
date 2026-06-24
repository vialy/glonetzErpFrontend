"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import {
  learnerFromCreateFallback,
  parseStaffLearner,
  parseStaffLearnerList,
  toCreateLearnerBody,
  toUpdateLearnerBody,
} from "@/domains/learners/learners-api-mapper"
import type {
  BatchAssignClassInput,
  BulkCreateLearnerFailure,
  BulkCreateLearnerSkip,
  BulkCreateStaffLearnersInput,
  BulkCreateStaffLearnersResult,
  CreateStaffLearnerInput,
  LearnersProvider,
  ListStaffLearnersQuery,
  StaffLearner,
  UpdateStaffLearnerInput,
} from "@/domains/learners/types"

// When fetching the full list we use the backend's max page size so we make as
// few round-trips as possible (each request is ~400ms on Render).
const FETCH_ALL_PAGE_SIZE = 100
const MAX_PAGES = 50
// The backend dispatches SMS/email via fire-and-forget, so creation responds as
// soon as the row is written (~300ms) and returns the created user. We keep a
// generous abort only for the bulk endpoint, which can legitimately take longer.
const BULK_REQUEST_MS = 120_000

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

/**
 * Renvoie l'objet "data" d'une reponse batch reconnaissable (contenant summary
 * ou created/skipped/failed), meme si elle est encapsulee dans une enveloppe
 * { success, data }. Renvoie null si le payload n'est pas un rapport de batch.
 * Utile pour recuperer le rapport meme quand le backend renvoie un statut HTTP
 * d'erreur sur un lot partiellement traite.
 */
function findBatchData(payload: unknown): unknown | null {
  const root = asRecord(payload)
  const data = root && asRecord(root.data) ? root.data : payload
  const record = asRecord(data)
  if (!record) return null
  const hasBatchShape =
    asRecord(record.summary) !== null ||
    "created" in record ||
    "skipped" in record ||
    "failed" in record
  return hasBatchShape ? data : null
}

/**
 * Parse la reponse de `POST /staff/users/batch`.
 * Forme attendue: { summary: { total, created, skipped, failed }, created: [], skipped: [], failed: [] }.
 * Tolere une eventuelle imbrication ou des champs manquants.
 */
function parseBatchResult(data: unknown, sent: number): BulkCreateStaffLearnersResult {
  const root = asRecord(data)
  const record = root && asRecord(root.data) ? asRecord(root.data)! : root

  const summary = record ? asRecord(record.summary) : null
  const createdArr = record && Array.isArray(record.created) ? record.created : []
  const skippedArr = record && Array.isArray(record.skipped) ? record.skipped : []
  const failedArr = record && Array.isArray(record.failed) ? record.failed : []

  const recognized =
    !!summary ||
    (record !== null && ("created" in record || "skipped" in record || "failed" in record))

  const createdCount = asNumber(summary?.created) ?? createdArr.length
  const skippedCount = asNumber(summary?.skipped) ?? skippedArr.length
  const failedCount = asNumber(summary?.failed) ?? failedArr.length
  const total = asNumber(summary?.total) ?? sent

  const skipped: BulkCreateLearnerSkip[] = skippedArr.map((entry, idx) => {
    const e = asRecord(entry) ?? {}
    return {
      index: asNumber(e.index) ?? idx,
      reason: asString(e.reason),
      phone: asString(e.phone),
      email: asString(e.email),
    }
  })

  const failed: BulkCreateLearnerFailure[] = failedArr.map((entry, idx) => {
    const e = asRecord(entry) ?? {}
    const input = asRecord(e.input)
    return {
      index: asNumber(e.index) ?? idx,
      name: asString(input?.name),
      phone: asString(input?.phone),
      errorMsg: asString(e.errorMsg),
    }
  })

  return {
    total,
    createdCount: recognized ? createdCount : sent,
    skippedCount,
    failedCount,
    skipped,
    failed,
    raw: data,
  }
}

async function postCreateLearner(body: Record<string, unknown>) {
  return apiRequest<unknown>("/staff/users", { method: "POST", body })
}

async function fetchAllLearners(query: ListStaffLearnersQuery = {}) {
  const pageSize = query.pageSize ?? FETCH_ALL_PAGE_SIZE
  let pageNum = query.pageNum ?? 1
  const all: StaffLearner[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>("/staff/users", {
      method: "GET",
      query: {
        pageNum,
        pageSize,
        q: query.q,
        classId: query.classId,
      },
    })
    const batch = parseStaffLearnerList(data)
    all.push(...batch)
    if (batch.length < pageSize) break
    pageNum += 1
  }

  return all
}

function notifyLearnersUpdated() {
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      window.dispatchEvent(new Event("admin-learners-updated"))
    }, 0)
  }
}

function resolveCreatedLearner(
  input: CreateStaffLearnerInput,
  data: unknown,
): StaffLearner {
  // The create response now carries the full user object, so we parse it
  // directly. If the shape is ever unexpected, fall back to the submitted input
  // (no extra round-trip needed).
  try {
    return parseStaffLearner(data)
  } catch {
    return learnerFromCreateFallback(input, data)
  }
}

export const httpLearnersProvider: LearnersProvider = {
  async list(query) {
    return fetchAllLearners(query)
  },

  async get(id) {
    try {
      const data = await apiRequest<unknown>(`/staff/users/${encodeURIComponent(id)}`, {
        method: "GET",
      })
      return parseStaffLearner(data)
    } catch {
      return null
    }
  },

  async create(input: CreateStaffLearnerInput) {
    const body = toCreateLearnerBody(input)
    const data = await postCreateLearner(body)
    const created = resolveCreatedLearner(input, data)
    notifyLearnersUpdated()
    return created
  },

  async createBulk(input: BulkCreateStaffLearnersInput) {
    const users = input.users.map((user) => {
      const item: Record<string, unknown> = {
        name: user.name.trim(),
        phone: user.phone.trim(),
        classId: user.classId,
      }
      const email = user.email?.trim()
      if (email) item.email = email
      return item
    })

    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), BULK_REQUEST_MS)
    let data: unknown
    try {
      data = await apiRequest<unknown>("/staff/users/batch", {
        method: "POST",
        body: {
          options: { skipDuplicates: input.skipDuplicates ?? true },
          users,
        },
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("CREATE_LEARNER_TIMEOUT")
      }
      // Le backend peut renvoyer un statut HTTP d'erreur sur un lot partiellement
      // traite (certains crees, d'autres en echec) : on recupere quand meme le rapport.
      if (error instanceof ApiClientError) {
        const batchData = findBatchData(error.payload)
        if (batchData) {
          notifyLearnersUpdated()
          return parseBatchResult(batchData, users.length)
        }
      }
      throw error
    } finally {
      window.clearTimeout(timer)
    }

    notifyLearnersUpdated()
    return parseBatchResult(data, users.length)
  },

  async update(id: string, input: UpdateStaffLearnerInput) {
    const { classId, ...profileInput } = input
    const body = toUpdateLearnerBody(profileInput)

    if (Object.keys(body).length > 0) {
      await apiRequest<unknown>(`/staff/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      })
    }

    if (classId !== undefined) {
      await apiRequest<void>("/staff/users/batch-assign-class", {
        method: "POST",
        body: {
          userIds: [id],
          classId,
        },
      })
    }

    if (Object.keys(body).length === 0 && classId === undefined) {
      return this.get(id)
    }

    const updated = await this.get(id)
    notifyLearnersUpdated()
    return updated
  },

  async batchAssignClass(input: BatchAssignClassInput) {
    await apiRequest<void>("/staff/users/batch-assign-class", {
      method: "POST",
      body: {
        userIds: input.userIds,
        classId: input.classId,
      },
    })
    notifyLearnersUpdated()
  },

  async setActive(id: string, active: boolean) {
    // Routes dediees et auditables : PATCH /staff/users/:id/enable | /disable.
    const action = active ? "enable" : "disable"
    const data = await apiRequest<unknown>(`/staff/users/${encodeURIComponent(id)}/${action}`, {
      method: "PATCH",
    })
    notifyLearnersUpdated()
    try {
      return parseStaffLearner(data)
    } catch {
      return this.get(id)
    }
  },

  async regeneratePassword(id: string) {
    await apiRequest<void>(`/staff/users/${encodeURIComponent(id)}/regenerate-password`, {
      method: "POST",
      body: {},
    })
  },
}
