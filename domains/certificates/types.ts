export const CERTIFICATE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type CertificateLevel = (typeof CERTIFICATE_LEVELS)[number]

export const COURSE_INFO_OPTIONS = [
  "Complete level",
  "Partially completed level",
  "Course dropped out",
  "No participation",
] as const
export type CourseInfo = (typeof COURSE_INFO_OPTIONS)[number]

export const EVALUATION_OPTIONS = ["Outstanding", "Good", "Satisfactory", "Participant"] as const
export type Evaluation = (typeof EVALUATION_OPTIONS)[number]

/** Cycle de vie : brouillon / en attente → disponible (après validation admin). */
export type CertificateStatus = "brouillon" | "en_attente" | "disponible"

export type CertificateKind = "formation" | "scolarite"

export type CertificateCreatorRole = "admin" | "manager"

export interface Certificate {
  id: string
  referenceNumber: string
  /** formation = attestation de fin de formation ; scolarite = certificat de scolarité. */
  certificateKind?: CertificateKind
  fullName: string
  /** ISO date (yyyy-mm-dd) */
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: CertificateLevel
  /** ISO date (yyyy-mm-dd) */
  courseStartDate: string
  /** ISO date (yyyy-mm-dd) */
  courseEndDate: string
  lessonUnits: number
  lessonsAttended: number
  courseInfo: CourseInfo
  evaluation: Evaluation
  comments?: string
  /** Lien optionnel vers l'apprenant et sa classe (génération auto-remplie). */
  learnerId?: string
  classId?: string
  className?: string
  /** Créneau horaire de la classe (MO, MI, NM, AB). */
  timeSlot?: string
  status: CertificateStatus
  createdByRole: CertificateCreatorRole
  createdByStaffId?: string
  /** Date de mise à disposition (passage à "disponible"). */
  issuedAt?: string
  approvedAt?: string
  approvedByStaffId?: string
  /** Signature figée à l'approbation (data URL PNG). */
  signatureSnapshotUrl?: string
  createdAt: string
}

export interface CreateCertificateInput {
  fullName: string
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: CertificateLevel
  courseStartDate: string
  courseEndDate: string
  lessonUnits: number
  lessonsAttended: number
  courseInfo: CourseInfo
  comments?: string
  evaluation: Evaluation
  learnerId?: string
  classId?: string
  className?: string
}

export type UpdateCertificateInput = Partial<CreateCertificateInput>

export interface CertificateCreateMeta {
  createdByRole: CertificateCreatorRole
  createdByStaffId?: string
}

export interface CertificatesProvider {
  getAll(): Promise<Certificate[]>
  create(input: CreateCertificateInput, meta?: CertificateCreateMeta): Promise<Certificate>
  update(id: string, input: UpdateCertificateInput): Promise<Certificate>
  setStatus(id: string, status: CertificateStatus): Promise<Certificate>
  approve(id: string, approvedByStaffId?: string): Promise<Certificate>
  revoke(id: string): Promise<Certificate>
  remove(id: string): Promise<void>
  getById(id: string): Promise<Certificate | null>
}
