// Treasury account
export interface Account {
  id: string
  initials: string
  name: string
  amount: string
  currency: string
  transactions: number
  lastSync: string
}

// Sidebar navigation
export interface NavItem {
  label: string
  icon: React.ReactNode
  active?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// Auth
export type UserRole = "admin" | "manager" | "student" | "accountant"

export interface LoginResponse {
  token: string
  role: UserRole
  mustChangePin: boolean
  /** E.164 — présent après connexion mock/API pour le profil et le changement de PIN */
  phone?: string
}

export interface AuthState {
  token: string | null
  role: UserRole | null
  mustChangePin: boolean
}
