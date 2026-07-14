"use client"

import { apiRequest } from "@/core/api/client"
import type { Certificate, CertificateStatus, UpdateCertificateInput } from "@/domains/certificates/types"
import type {
  ListSchoolCertificatesQuery,
  SchoolCertDownloadEligibility,
  SchoolCertificate,
  SchoolCertificatesProvider,
} from "@/domains/school-certificates/types"
import type { SchoolCertificateTemplate } from "@/services/school-certificate-template.service"

const FETCH_ALL_PAGE_SIZE = 100
const MAX_PAGES = 50

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseCertificateList(data: unknown): SchoolCertificate[] {
  const root = asRecord(data)
  const certificates = root?.certificates
  return Array.isArray(certificates) ? (certificates as SchoolCertificate[]) : []
}

function parseDownloadEligibility(data: unknown): SchoolCertDownloadEligibility {
  const root = asRecord(data)
  return {
    tuitionFullyPaid: Boolean(root?.tuitionFullyPaid),
    templateReady: Boolean(root?.templateReady),
    allowed: Boolean(root?.allowed),
    reason: typeof root?.reason === "string" && root.reason.trim() ? root.reason : undefined,
  }
}

function parseTemplate(data: unknown): SchoolCertificateTemplate {
  const root = asRecord(data)
  const template = root?.template
  if (!template || typeof template !== "object") {
    throw new Error("SCHOOL_CERT_TEMPLATE_MISSING")
  }
  return template as SchoolCertificateTemplate
}

async function fetchAllSchoolCertificates(query: ListSchoolCertificatesQuery = {}) {
  const pageSize = query.pageSize ?? FETCH_ALL_PAGE_SIZE
  let pageNum = query.pageNum ?? 1
  const all: SchoolCertificate[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<unknown>("/staff/school-certificates", {
      method: "GET",
      query: {
        pageNum,
        pageSize,
        userId: query.userId,
        classId: query.classId,
        q: query.q,
      },
    })
    const batch = parseCertificateList(data)
    all.push(...batch)
    if (batch.length < pageSize) break
    pageNum += 1
  }

  return all
}

export const httpSchoolCertificatesProvider: SchoolCertificatesProvider = {
  async list(query) {
    return fetchAllSchoolCertificates(query)
  },
  async syncAll() {
    const data = await apiRequest<{ certificates: Certificate[] }>("/staff/school-certificates/sync", {
      method: "POST",
    })
    return Array.isArray(data.certificates) ? data.certificates : []
  },
  async getDownloadEligibility(certificateId) {
    const data = await apiRequest<unknown>(
      `/staff/school-certificates/${encodeURIComponent(certificateId)}/download-eligibility`,
      { method: "GET" },
    )
    return parseDownloadEligibility(data)
  },
  async getTemplate() {
    const data = await apiRequest<unknown>("/staff/school-certificates/template", { method: "GET" })
    return parseTemplate(data)
  },
  async updateTemplate(template) {
    const data = await apiRequest<unknown>("/staff/school-certificates/template", {
      method: "PUT",
      body: template,
    })
    return parseTemplate(data)
  },
  async update(id, input) {
    const data = await apiRequest<{ certificate: Certificate }>(`/staff/school-certificates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
    })
    return data.certificate
  },
  async setStatus(id, status) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/school-certificates/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    )
    return data.certificate
  },
  async approve(id, approvedByStaffId) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/school-certificates/${encodeURIComponent(id)}/approve`,
      { method: "POST", body: approvedByStaffId ? { approvedByStaffId } : undefined },
    )
    return data.certificate
  },
  async revoke(id) {
    const data = await apiRequest<{ certificate: Certificate }>(
      `/staff/school-certificates/${encodeURIComponent(id)}/revoke`,
      { method: "POST" },
    )
    return data.certificate
  },
  async remove(id) {
    await apiRequest<void>(`/staff/school-certificates/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
}
