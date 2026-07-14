"use client"

import { isApiDataProvider } from "@/lib/data-provider"
import { httpSchoolCertificatesProvider } from "@/domains/school-certificates/providers/http"
import { mockSchoolCertificatesProvider } from "@/domains/school-certificates/providers/mock"
import type {
  ListSchoolCertificatesQuery,
  SchoolCertificate,
  SchoolCertDownloadEligibility,
} from "@/domains/school-certificates/types"
import type { CertificateStatus, UpdateCertificateInput } from "@/domains/certificates/types"
import type { SchoolCertificateTemplate } from "@/services/school-certificate-template.service"

const provider = isApiDataProvider() ? httpSchoolCertificatesProvider : mockSchoolCertificatesProvider

export const schoolCertificatesService = {
  list(query?: ListSchoolCertificatesQuery): Promise<SchoolCertificate[]> {
    return provider.list(query)
  },
  syncAll(): Promise<SchoolCertificate[]> {
    return provider.syncAll()
  },
  getDownloadEligibility(certificateId: string): Promise<SchoolCertDownloadEligibility> {
    return provider.getDownloadEligibility(certificateId)
  },
  getTemplate(): Promise<SchoolCertificateTemplate> {
    return provider.getTemplate()
  },
  updateTemplate(template: SchoolCertificateTemplate): Promise<SchoolCertificateTemplate> {
    return provider.updateTemplate(template)
  },
  update(id: string, input: UpdateCertificateInput): Promise<SchoolCertificate> {
    return provider.update(id, input)
  },
  setStatus(id: string, status: CertificateStatus): Promise<SchoolCertificate> {
    return provider.setStatus(id, status)
  },
  approve(id: string, approvedByStaffId?: string): Promise<SchoolCertificate> {
    return provider.approve(id, approvedByStaffId)
  },
  revoke(id: string): Promise<SchoolCertificate> {
    return provider.revoke(id)
  },
  remove(id: string): Promise<void> {
    return provider.remove(id)
  },
}
