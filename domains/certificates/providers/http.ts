"use client"

import { apiRequest } from "@/core/api/client"
import type {
  Certificate,
  CertificateCreateMeta,
  CertificatesProvider,
  CertificateStatus,
  CreateCertificateInput,
  UpdateCertificateInput,
} from "@/domains/certificates/types"

const FETCH_ALL_PAGE_SIZE = 100
const MAX_PAGES = 50

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseCertificateList(data: unknown): Certificate[] {
  const root = asRecord(data)
  const certificates = root?.certificates
  return Array.isArray(certificates) ? (certificates as Certificate[]) : []
}

async function fetchAllCertificates() {
  let pageNum = 1
  const all: Certificate[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>("/staff/certificates", {
      method: "GET",
      query: { pageNum, pageSize: FETCH_ALL_PAGE_SIZE },
    })
    const batch = parseCertificateList(data)
    all.push(...batch)
    if (batch.length < FETCH_ALL_PAGE_SIZE) break
    pageNum += 1
  }

  return all
}

export const httpCertificatesProvider: CertificatesProvider = {
  async getAll() {
    return fetchAllCertificates()
  },
  async create(input, _meta?: CertificateCreateMeta) {
    const data = await apiRequest<{ certificate: Certificate }>("/staff/certificates", {
      method: "POST",
      body: input,
    })
    return data.certificate
  },
  async update(id, input) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/certificates/${encodeURIComponent(id)}`,
      { method: "PUT", body: input },
    )
    return data.certificate
  },
  async setStatus(id, status) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/certificates/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    )
    return data.certificate
  },
  async approve(id, approvedByStaffId) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/certificates/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        body: approvedByStaffId ? { approvedByStaffId } : undefined,
      },
    )
    return data.certificate
  },
  async revoke(id) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/certificates/${encodeURIComponent(id)}/revoke`,
      { method: "POST" },
    )
    return data.certificate
  },
  async remove(id) {
    await apiRequest<void>(`/staff/certificates/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
  async getById(id) {
    try {
      const data = await apiRequest<{ certificate?: Certificate }>(
        `/staff/certificates/${encodeURIComponent(id)}`,
        { method: "GET" },
      )
      return data.certificate ?? null
    } catch {
      return null
    }
  },
}
