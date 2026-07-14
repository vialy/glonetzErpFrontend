export type UserRole = "admin" | "manager" | "student" | "accountant" | "collaborateur"

export interface LoginResponse {
  token: string
  role: UserRole
  /** Compat historique : indique un changement de mot de passe obligatoire. */
  mustChangePin: boolean
  email?: string
  phone?: string
  staffUserId?: string
  fullName?: string
}
