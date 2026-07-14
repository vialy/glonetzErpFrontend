"use client"

import { isApiDataProvider } from "@/lib/data-provider"
import { httpCertificatesProvider } from "@/domains/certificates/providers/http"
import { mockCertificatesProvider } from "@/domains/certificates/providers/mock"
import type {
  Certificate,
  CertificateCreateMeta,
  CertificateStatus,
  CreateCertificateInput,
  UpdateCertificateInput,
} from "@/domains/certificates/types"

const provider = isApiDataProvider() ? httpCertificatesProvider : mockCertificatesProvider

export const certificatesService = {
  getAll(): Promise<Certificate[]> {
    return provider.getAll()
  },
  create(input: CreateCertificateInput, meta?: CertificateCreateMeta): Promise<Certificate> {
    return provider.create(input, meta)
  },
  update(id: string, input: UpdateCertificateInput): Promise<Certificate> {
    return provider.update(id, input)
  },
  setStatus(id: string, status: CertificateStatus): Promise<Certificate> {
    return provider.setStatus(id, status)
  },
  approve(id: string, approvedByStaffId?: string): Promise<Certificate> {
    return provider.approve(id, approvedByStaffId)
  },
  revoke(id: string): Promise<Certificate> {
    return provider.revoke(id)
  },
  remove(id: string): Promise<void> {
    return provider.remove(id)
  },
  getById(id: string): Promise<Certificate | null> {
    return provider.getById(id)
  },
}
