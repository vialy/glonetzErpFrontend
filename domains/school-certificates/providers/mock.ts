"use client"

import type { CertificateStatus, UpdateCertificateInput } from "@/domains/certificates/types"
import type { SchoolCertificatesProvider, SchoolCertDownloadEligibility } from "@/domains/school-certificates/types"
import { resolveSchoolCertificateTuitionFullyPaid } from "@/lib/school-certificate-tuition"
import { syncSchoolCertificatesForLearners } from "@/lib/school-certificate-provision"
import { CertificatesService } from "@/services/certificates.service"
import {
  SchoolCertificateTemplateService,
  type SchoolCertificateTemplate,
} from "@/services/school-certificate-template.service"
import { learnersService } from "@/domains/learners"
import { classesService } from "@/domains/classes"
import { canDownloadSchoolCertificate } from "@/lib/school-certificate-permissions"

export const mockSchoolCertificatesProvider: SchoolCertificatesProvider = {
  async list() {
    return CertificatesService.getAll().filter((c) => c.certificateKind === "scolarite")
  },
  async syncAll() {
    const [learners, classes] = await Promise.all([
      learnersService.list({ pageSize: 500 }),
      classesService.list({ pageSize: 200 }),
    ])
    const classesById = Object.fromEntries(classes.map((c) => [c.id, c]))
    return syncSchoolCertificatesForLearners(learners, classesById)
  },
  async getDownloadEligibility(certificateId): Promise<SchoolCertDownloadEligibility> {
    const [certificates, learners, classes] = await Promise.all([
      this.list(),
      learnersService.list({ pageSize: 500 }),
      classesService.list({ pageSize: 200 }),
    ])
    const certificate = certificates.find((item) => item.id === certificateId)
    if (!certificate) throw new Error("CERTIFICATE_NOT_FOUND")
    const learner = certificate.learnerId
      ? learners.find((item) => item.id === certificate.learnerId)
      : undefined
    const tuitionFullyPaid = resolveSchoolCertificateTuitionFullyPaid(certificate, learner, classes)
    const templateReady = SchoolCertificateTemplateService.isReadyForLearnerDownload()
    const decision = canDownloadSchoolCertificate("manager", certificate, { tuitionFullyPaid })
    return {
      tuitionFullyPaid,
      templateReady,
      allowed: decision.allowed,
      reason: decision.reason,
    }
  },
  async getTemplate() {
    return SchoolCertificateTemplateService.get()
  },
  async updateTemplate(template: SchoolCertificateTemplate) {
    return SchoolCertificateTemplateService.save(template)
  },
  async update(id, input: UpdateCertificateInput) {
    return CertificatesService.update(id, input)
  },
  async setStatus(id, status: CertificateStatus) {
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
}
