import type {
  Certificate,
  CertificateStatus,
  UpdateCertificateInput,
} from "@/domains/certificates/types"
import type { SchoolCertificateTemplate } from "@/services/school-certificate-template.service"

export type SchoolCertificate = Certificate & {
  /** Renseigné par l'API (Payment.classSummary) — source de vérité en mode api. */
  tuitionFullyPaid?: boolean
}

export interface SchoolCertDownloadEligibility {
  tuitionFullyPaid: boolean
  templateReady: boolean
  allowed: boolean
  reason?: string
}

export interface ListSchoolCertificatesQuery {
  userId?: string
  classId?: string
  q?: string
  pageNum?: number
  pageSize?: number
}

export interface SchoolCertificatesProvider {
  list(query?: ListSchoolCertificatesQuery): Promise<SchoolCertificate[]>
  syncAll(): Promise<SchoolCertificate[]>
  getDownloadEligibility(certificateId: string): Promise<SchoolCertDownloadEligibility>
  getTemplate(): Promise<SchoolCertificateTemplate>
  updateTemplate(template: SchoolCertificateTemplate): Promise<SchoolCertificateTemplate>
  update(id: string, input: UpdateCertificateInput): Promise<SchoolCertificate>
  setStatus(id: string, status: CertificateStatus): Promise<SchoolCertificate>
  approve(id: string, approvedByStaffId?: string): Promise<SchoolCertificate>
  revoke(id: string): Promise<SchoolCertificate>
  remove(id: string): Promise<void>
}
