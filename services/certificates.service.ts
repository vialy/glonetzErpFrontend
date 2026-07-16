"use client"

import { SignatureService } from "@/services/signature.service"
import type {
  Certificate,
  CertificateCreateMeta,
  CertificateLevel,
  CertificateStatus,
  CreateCertificateInput,
  UpdateCertificateInput,
} from "@/domains/certificates/types"

const STORAGE_KEY = "glonetz_certificates_v1"

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function normalizeCertificate(c: Certificate): Certificate {
  return {
    ...c,
    certificateKind: c.certificateKind ?? "formation",
    status: c.status ?? "brouillon",
    createdByRole: c.createdByRole ?? "admin",
  }
}

function readCertificates(): Certificate[] {
  if (!canUseStorage()) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((c) => normalizeCertificate(c as Certificate)) : []
  } catch {
    return []
  }
}

function saveCertificates(certificates: Certificate[]) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates))
  window.dispatchEvent(new Event("certificates-updated"))
}

function generateSchoolReferenceNumber(certificates: Certificate[]): string {
  const year = new Date().getFullYear()
  const prefix = `SCOL-${year}-`
  let max = 0
  for (const c of certificates) {
    if (c.certificateKind !== "scolarite" || !c.referenceNumber?.startsWith(prefix)) continue
    const seq = Number.parseInt(c.referenceNumber.slice(prefix.length), 10)
    if (Number.isFinite(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`
}

function generateReferenceNumber(certificates: Certificate[], level: CertificateLevel): string {
  const year = new Date().getFullYear()
  const prefix = `GLZ-${year}-${level}-`
  let max = 0
  for (const c of certificates) {
    if (!c.referenceNumber?.startsWith(prefix)) continue
    const seq = Number.parseInt(c.referenceNumber.slice(prefix.length), 10)
    if (Number.isFinite(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function validateInput(input: CreateCertificateInput | UpdateCertificateInput) {
  if (input.fullName !== undefined && !input.fullName.trim()) throw new Error("FULLNAME_REQUIRED")
  if (input.placeOfBirth !== undefined && !input.placeOfBirth.trim()) throw new Error("PLACE_REQUIRED")
  if (input.dateOfBirth !== undefined && !input.dateOfBirth) throw new Error("BIRTHDATE_REQUIRED")
  if (input.courseStartDate !== undefined && !input.courseStartDate) throw new Error("START_REQUIRED")
  if (input.courseEndDate !== undefined && !input.courseEndDate) throw new Error("END_REQUIRED")

  if (input.courseStartDate && input.courseEndDate) {
    if (new Date(input.courseEndDate).getTime() < new Date(input.courseStartDate).getTime()) {
      throw new Error("END_BEFORE_START")
    }
  }

  const units = input.lessonUnits
  const attended = input.lessonsAttended
  if (typeof units === "number" && typeof attended === "number" && attended > units) {
    throw new Error("ATTENDED_GT_UNITS")
  }
}

export const CertificatesService = {
  getAll(): Certificate[] {
    return readCertificates().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
  },

  create(input: CreateCertificateInput, meta?: CertificateCreateMeta): Certificate {
    validateInput(input)

    const certificates = readCertificates()
    const createdByRole = meta?.createdByRole ?? "admin"
    const initialStatus: CertificateStatus = createdByRole === "manager" ? "en_attente" : "brouillon"

    const duplicate = certificates.find(
      (c) =>
        normalizeName(c.fullName) === normalizeName(input.fullName) &&
        c.dateOfBirth === input.dateOfBirth &&
        c.referenceLevel === input.referenceLevel &&
        new Date(c.courseStartDate).getTime() <= new Date(input.courseEndDate).getTime() &&
        new Date(c.courseEndDate).getTime() >= new Date(input.courseStartDate).getTime(),
    )
    if (duplicate) throw new Error("DUPLICATE_CERTIFICATE")

    const certificate: Certificate = {
      id: `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      referenceNumber: generateReferenceNumber(certificates, input.referenceLevel),
      certificateKind: "formation",
      fullName: input.fullName.trim(),
      dateOfBirth: input.dateOfBirth,
      placeOfBirth: input.placeOfBirth.trim(),
      referenceLevel: input.referenceLevel,
      courseStartDate: input.courseStartDate,
      courseEndDate: input.courseEndDate,
      lessonUnits: input.lessonUnits,
      lessonsAttended: input.lessonsAttended,
      courseInfo: input.courseInfo,
      evaluation: input.evaluation,
      comments: input.comments?.trim() || "",
      learnerId: input.learnerId,
      classId: input.classId,
      className: input.className,
      status: initialStatus,
      createdByRole,
      createdByStaffId: meta?.createdByStaffId,
      createdAt: new Date().toISOString(),
    }

    saveCertificates([certificate, ...certificates])
    return certificate
  },

  createSchoolCertificate(input: {
    learnerId: string
    fullName: string
    dateOfBirth: string
    placeOfBirth: string
    referenceLevel: CertificateLevel
    courseStartDate: string
    courseEndDate: string
    classId?: string
    className?: string
    timeSlot?: string
  }): Certificate {
    const certificates = readCertificates()
    const now = new Date().toISOString()
    const certificate: Certificate = {
      id: `SCOL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      referenceNumber: generateSchoolReferenceNumber(certificates),
      certificateKind: "scolarite",
      fullName: input.fullName.trim(),
      dateOfBirth: input.dateOfBirth,
      placeOfBirth: input.placeOfBirth.trim(),
      referenceLevel: input.referenceLevel,
      courseStartDate: input.courseStartDate,
      courseEndDate: input.courseEndDate,
      lessonUnits: 0,
      lessonsAttended: 0,
      courseInfo: "Complete level",
      evaluation: "Participant",
      comments: "",
      learnerId: input.learnerId,
      classId: input.classId,
      className: input.className,
      timeSlot: input.timeSlot,
      status: "disponible",
      createdByRole: "admin",
      issuedAt: now,
      createdAt: now,
    }
    saveCertificates([certificate, ...certificates])
    return certificate
  },

  syncSchoolCertificate(input: {
    learnerId: string
    fullName: string
    dateOfBirth: string
    placeOfBirth: string
    referenceLevel: CertificateLevel
    courseStartDate: string
    courseEndDate: string
    classId?: string
    className?: string
    timeSlot?: string
  }): Certificate {
    const certificates = readCertificates()
    const index = certificates.findIndex(
      (c) => c.certificateKind === "scolarite" && c.learnerId === input.learnerId,
    )
    const now = new Date().toISOString()
    const classChanged = index >= 0 && certificates[index].classId !== input.classId

    if (index >= 0) {
      const current = certificates[index]
      const updated: Certificate = {
        ...current,
        fullName: input.fullName.trim(),
        dateOfBirth: input.dateOfBirth,
        placeOfBirth: input.placeOfBirth.trim(),
        referenceLevel: input.referenceLevel,
        courseStartDate: input.courseStartDate,
        courseEndDate: input.courseEndDate,
        classId: input.classId,
        className: input.className,
        timeSlot: input.timeSlot,
        status: "disponible",
        ...(classChanged
          ? {
              referenceNumber: generateSchoolReferenceNumber(certificates),
              issuedAt: now,
            }
          : {}),
      }
      const next = [...certificates]
      next[index] = updated
      saveCertificates(next)
      return updated
    }

    return this.createSchoolCertificate(input)
  },

  approve(id: string, approvedByStaffId?: string): Certificate {
    const certificates = readCertificates()
    const index = certificates.findIndex((c) => c.id === id)
    if (index === -1) throw new Error("CERTIFICATE_NOT_FOUND")

    const current = certificates[index]
    if (current.status === "disponible") return current

    const snapshot = SignatureService.get() ?? undefined
    const now = new Date().toISOString()
    const updated: Certificate = {
      ...current,
      status: "disponible",
      issuedAt: now,
      approvedAt: now,
      approvedByStaffId,
      signatureSnapshotUrl: snapshot,
    }
    const next = [...certificates]
    next[index] = updated
    saveCertificates(next)
    return updated
  },

  revoke(id: string): Certificate {
    const certificates = readCertificates()
    const index = certificates.findIndex((c) => c.id === id)
    if (index === -1) throw new Error("CERTIFICATE_NOT_FOUND")

    const current = certificates[index]
    const nextStatus: CertificateStatus = current.createdByRole === "manager" ? "en_attente" : "brouillon"
    const updated: Certificate = {
      ...current,
      status: nextStatus,
      issuedAt: undefined,
      approvedAt: undefined,
      approvedByStaffId: undefined,
      signatureSnapshotUrl: undefined,
    }
    const next = [...certificates]
    next[index] = updated
    saveCertificates(next)
    return updated
  },

  setStatus(id: string, status: CertificateStatus): Certificate {
    if (status === "disponible") {
      return this.approve(id)
    }
    if (status === "brouillon" || status === "en_attente") {
      const certificates = readCertificates()
      const index = certificates.findIndex((c) => c.id === id)
      if (index === -1) throw new Error("CERTIFICATE_NOT_FOUND")
      const current = certificates[index]
      const updated: Certificate = {
        ...current,
        status,
        issuedAt: undefined,
        approvedAt: undefined,
        approvedByStaffId: undefined,
        signatureSnapshotUrl: undefined,
      }
      const next = [...certificates]
      next[index] = updated
      saveCertificates(next)
      return updated
    }
    throw new Error("INVALID_STATUS")
  },

  update(id: string, input: UpdateCertificateInput): Certificate {
    validateInput(input)

    const certificates = readCertificates()
    const index = certificates.findIndex((c) => c.id === id)
    if (index === -1) throw new Error("CERTIFICATE_NOT_FOUND")

    const current = certificates[index]
    if (current.status === "disponible") throw new Error("CERTIFICATE_LOCKED")

    const updated: Certificate = {
      ...current,
      ...input,
      fullName: input.fullName?.trim() ?? current.fullName,
      placeOfBirth: input.placeOfBirth?.trim() ?? current.placeOfBirth,
      comments: input.comments !== undefined ? input.comments.trim() : current.comments,
    }

    if (current.learnerId) {
      updated.fullName = current.fullName
      updated.dateOfBirth = current.dateOfBirth
      updated.courseStartDate = current.courseStartDate
      updated.courseEndDate = current.courseEndDate
      updated.learnerId = current.learnerId
      updated.classId = current.classId
      updated.className = current.className
    }

    const next = [...certificates]
    next[index] = updated
    saveCertificates(next)
    return updated
  },

  remove(id: string): void {
    const certificates = readCertificates()
    saveCertificates(certificates.filter((c) => c.id !== id))
  },

  countGeneratedFormations(): number {
    return readCertificates().filter(
      (c) => c.certificateKind === "formation" && c.status === "disponible",
    ).length
  },

  syncFormationSignatureSnapshots(): number {
    const snapshot = SignatureService.get() ?? undefined
    const certificates = readCertificates()
    let updatedCount = 0
    const next = certificates.map((c) => {
      if (c.certificateKind !== "formation" || c.status !== "disponible") return c
      updatedCount += 1
      return { ...c, signatureSnapshotUrl: snapshot }
    })
    if (updatedCount > 0) saveCertificates(next)
    return updatedCount
  },
}
