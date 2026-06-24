export type StaffClassStatus = "active" | "finished" | "archived"

export interface StaffClass {
  id: string
  name: string
  description: string
  session: string
  periodStart: string
  periodEnd: string
  status: StaffClassStatus
  learnersCount: number
  tuitionAmount: number
  totalDue: number
  totalPaid: number
  chartData: { label: string; paid: number }[]
}

export interface CreateStaffClassInput {
  name: string
  description?: string
  periodStart: string
  periodEnd: string
  tuitionAmount: number
  status?: StaffClassStatus
  locale?: "fr" | "en"
}

export interface UpdateStaffClassInput {
  name?: string
  description?: string
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

/** Rollup financier d'une classe calcule cote back-end (GET /staff/classes/:id/details). */
export interface StaffClassStats {
  studentCount: number
  fullyPaidCount: number
  partiallyPaidCount: number
  unpaidCount: number
  totalExpected: number
  totalPaid: number
  totalRemaining: number
  currencyCode?: string
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
