import type { ClassLevel, ClassTimeSlot } from "@/lib/class-metadata"

export type StaffClassStatus = "active" | "finished" | "archived"

export interface StaffClass {
  id: string
  name: string
  description: string
  level: ClassLevel
  timeSlot: ClassTimeSlot
  session: string
  periodStart: string
  periodEnd: string
  status: StaffClassStatus
  learnersCount: number
  tuitionAmount: number
  totalDue: number
  totalPaid: number
  /** Inscrits × pension — mode API. */
  totalDueExpected?: number
  /** Scolarité attendue − encaissé — mode API. */
  totalRemaining?: number
  /** Inscrits distincts sur la session — renseigné en mode API via /details. */
  sessionEnrolledCount?: number
  /** Apprenants promus ailleurs — renseigné en mode API via /details. */
  sessionPromotedCount?: number
  chartData: { label: string; paid: number }[]
}

export interface CreateStaffClassInput {
  name: string
  description?: string
  level: ClassLevel
  timeSlot: ClassTimeSlot
  periodStart: string
  periodEnd: string
  tuitionAmount: number
  status?: StaffClassStatus
  locale?: "fr" | "en"
}

export interface UpdateStaffClassInput {
  name?: string
  description?: string
  level?: ClassLevel
  timeSlot?: ClassTimeSlot
  periodStart?: string
  periodEnd?: string
  status?: StaffClassStatus
  tuitionAmount?: number
  locale?: "fr" | "en"
}

export interface ListStaffClassesQuery {
  pageNum?: number
  pageSize?: number
  q?: string
}

/** Bloc financier « en cours » ou « session » renvoyé par GET /staff/classes/:id/details. */
export interface StaffClassStatsBlock {
  studentCount: number
  fullyPaidCount: number
  partiallyPaidCount: number
  unpaidCount: number
  catalogExpected?: number
  netExpected?: number
  totalScholarship?: number
  scholarshipCount?: number
  scholarshipFullCount?: number
  totalExpected: number
  totalPaid: number
  totalRemaining: number
}

/** Bilan session — tous les ClassEnrollment + encaisse total de la classe. */
export interface StaffClassSessionStats {
  enrollmentCount: number
  studentCount: number
  leftCount: number
  totalExpected: number
  totalPaid: number
  totalRemaining: number
}

/** Rollup financier d'une classe calcule cote back-end (GET /staff/classes/:id/details). */
export interface StaffClassStats {
  currencyCode?: string
  current: StaffClassStatsBlock
  session: StaffClassSessionStats
  /** Champs plats legacy — conservés pour compatibilité. */
  studentCount: number
  fullyPaidCount: number
  partiallyPaidCount: number
  unpaidCount: number
  totalExpected: number
  totalPaid: number
  totalRemaining: number
}

export interface StaffClassDetails {
  class: StaffClass
  stats: StaffClassStats
}

export interface ClassesProvider {
  list(query?: ListStaffClassesQuery): Promise<StaffClass[]>
  get(id: string): Promise<StaffClass | null>
  getDetails(id: string): Promise<StaffClassDetails | null>
  create(input: CreateStaffClassInput): Promise<StaffClass>
  update(id: string, input: UpdateStaffClassInput): Promise<StaffClass | null>
}
