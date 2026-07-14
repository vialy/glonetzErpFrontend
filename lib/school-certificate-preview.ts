import type { Certificate } from "@/domains/certificates/types"

/** Certificat fictif pour l'aperçu PDF depuis l'éditeur de modèle. */
export const SCHOOL_CERTIFICATE_PDF_PREVIEW_SAMPLE: Certificate = {
  id: "school-cert-preview",
  referenceNumber: "SCOL-APERCU",
  certificateKind: "scolarite",
  fullName: "Jean DUPONT",
  dateOfBirth: "2000-01-15",
  placeOfBirth: "Douala",
  referenceLevel: "B1",
  courseStartDate: "2025-09-01",
  courseEndDate: "2026-06-30",
  lessonUnits: 0,
  lessonsAttended: 0,
  courseInfo: "Complete level",
  evaluation: "Participant",
  className: "Berlin-B1",
  timeSlot: "AB",
  status: "disponible",
  createdByRole: "admin",
  createdAt: new Date().toISOString(),
}
