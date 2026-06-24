export type ManagerRecordedPaymentMethod = "cash" | "mtn_momo" | "orange_money"

export interface ManagerLearnerPayment {
  id: string
  recordedAt: string
  amount: number
  method: ManagerRecordedPaymentMethod
  note?: string
}

export type ManagedLearnerStatus = "active" | "suspended"

export interface ManagedLearner {
  id: string
  fullName: string
  phone: string
  birthDate?: string
  className: string
  tuitionDue: number
  currencyCode: string
  enrolledAt: string
  status?: ManagedLearnerStatus
  notes?: string
  payments: ManagerLearnerPayment[]
}

export interface ManagedLearnerRow {
  fullName: string
  phone: string
  className: string
  tuitionDue: number
  birthDate?: string
  notes?: string
}

export interface LearnerPaymentStatusRow {
  learner: ManagedLearner
  amountPaid: number
  remaining: number
  status: "a_jour" | "partiel" | "impaye"
}
