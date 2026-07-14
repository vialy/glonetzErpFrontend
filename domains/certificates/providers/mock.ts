"use client"

import { CertificatesService } from "@/services/certificates.service"
import type { CertificatesProvider } from "@/domains/certificates/types"

export const mockCertificatesProvider: CertificatesProvider = {
  async getAll() {
    return CertificatesService.getAll()
  },
  async create(input, meta) {
    return CertificatesService.create(input, meta)
  },
  async update(id, input) {
    return CertificatesService.update(id, input)
  },
  async setStatus(id, status) {
    return CertificatesService.setStatus(id, status)
  },
  async approve(id, approvedByStaffId) {
    return CertificatesService.approve(id, approvedByStaffId)
  },
  async revoke(id) {
    return CertificatesService.revoke(id)
  },
  async remove(id) {
    CertificatesService.remove(id)
  },
  async getById(id) {
    const all = await CertificatesService.getAll()
    return all.find((certificate) => certificate.id === id) ?? null
  },
}
