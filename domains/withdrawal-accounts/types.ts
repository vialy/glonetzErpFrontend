export type WithdrawalProvider = "mtn" | "orange" | "neero"

export interface WithdrawalAccountRecord {
  id: string
  provider: WithdrawalProvider
  phoneNumber: string
  holderName?: string
  displayLabel?: string
  isVerified: boolean
  createdAt: string
}

export interface AddWithdrawalAccountInput {
  provider: WithdrawalProvider
  phoneNumber: string
  holderName?: string
}

/** @deprecated Use AddWithdrawalAccountInput */
export type AddNeeroWithdrawalAccountInput = Omit<AddWithdrawalAccountInput, "provider">
