export type ClaimPaymentMethod = "orange_money" | "mtn_momo"
export type ClaimStatus = "en_attente" | "en_cours" | "resolue" | "rejetee"

export interface ClaimRecord {
  id: string
  createdAt: string
  amount: number
  paymentMethod: ClaimPaymentMethod
  phoneNumber: string
  transactionReference: string
  description: string
  screenshotName?: string
  screenshotDataUrl?: string
  status: ClaimStatus
  // Champs cote staff (GET /staff/claims) — optionnels, absents cote etudiant.
  userId?: string
  userName?: string
  proofUrl?: string
}

export interface CreateClaimInput {
  amount: number
  paymentMethod: ClaimPaymentMethod
  phoneNumber: string
  transactionReference: string
  description: string
  screenshotFile?: File | null
}

export interface ClaimsProvider {
  getAll(): Promise<ClaimRecord[]>
  create(input: CreateClaimInput): Promise<ClaimRecord>
  updateStatus(id: string, status: ClaimStatus): Promise<ClaimRecord>
}

