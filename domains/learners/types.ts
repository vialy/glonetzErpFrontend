export type StaffLearnerStatus = "active" | "suspended"

export interface StaffLearner {
  id: string
  fullName: string
  phone: string
  email?: string
  classId: string
  className?: string
  createdAt: string
  dateOfBirth: string
  placeOfBirth: string
  pinInitialized: boolean
  mustChangePin: boolean
  status: StaffLearnerStatus
  due: number
  paid: number
}

export interface CreateStaffLearnerInput {
  name: string
  phone: string
  email?: string
  classId: string
  dateOfBirth?: string
  placeOfBirth?: string
}

export interface UpdateStaffLearnerInput {
  name?: string
  phone?: string
  email?: string
  classId?: string
  /** When correcting class via profile: move payments from the previous class. */
  transferPayments?: boolean
  dateOfBirth?: string
  placeOfBirth?: string
}

export interface BulkCreateLearnerItem {
  name: string
  phone: string
  classId: string
  email?: string
  dateOfBirth?: string
  placeOfBirth?: string
}

export interface BulkCreateStaffLearnersInput {
  users: BulkCreateLearnerItem[]
  skipDuplicates?: boolean
}

export interface BulkCreateLearnerSkip {
  index: number
  reason?: string
  phone?: string
  email?: string
}

export interface BulkCreateLearnerFailure {
  index: number
  name?: string
  phone?: string
  errorMsg?: string
}

export interface BulkCreateStaffLearnersResult {
  total: number
  createdCount: number
  skippedCount: number
  failedCount: number
  skipped: BulkCreateLearnerSkip[]
  failed: BulkCreateLearnerFailure[]
  raw?: unknown
}

export interface ListStaffLearnersQuery {
  pageNum?: number
  pageSize?: number
  q?: string
  classId?: string
}

export interface BatchAssignClassInput {
  userIds: string[]
  classId: string
}

export interface LearnersProvider {
  list(query?: ListStaffLearnersQuery): Promise<StaffLearner[]>
  get(id: string): Promise<StaffLearner | null>
  create(input: CreateStaffLearnerInput): Promise<StaffLearner>
  createBulk(input: BulkCreateStaffLearnersInput): Promise<BulkCreateStaffLearnersResult>
  update(id: string, input: UpdateStaffLearnerInput): Promise<StaffLearner | null>
  setActive(id: string, active: boolean): Promise<StaffLearner | null>
  batchAssignClass(input: BatchAssignClassInput): Promise<void>
  regeneratePassword(id: string): Promise<void>
  remove(id: string): Promise<void>
}
