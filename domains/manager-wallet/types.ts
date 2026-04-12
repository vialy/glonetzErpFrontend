import type { TranslationKey } from "@/services/i18n"

export type ManagerPaymentMethod = "cash" | "mtn_momo" | "orange_money" | "bank_transfer"

export interface ManagerExpenseRecord {
  id: string
  createdAt: string
  spentAt: string
  categoryId: string
  categoryLabel: string
  amount: number
  currencyCode: string
  paymentMethod: ManagerPaymentMethod
  comment?: string
  attachmentName?: string
  attachmentDataUrl?: string
}

export interface ManagerBudgetAllocation {
  id: string
  allocatedAt: string
  amount: number
  note: string
}

export interface ManagerBudgetSummary {
  /** Enveloppe courante (somme des allocations non « consommées » logiquement = plafond de dépense). */
  envelopeCeiling: number
  totalSpent: number
  remaining: number
  currencyCode: string
  periodHint?: string
}

export interface CreateManagerExpenseInput {
  categoryId: string
  categoryLabel: string
  amount: number
  spentAt: string
  paymentMethod: ManagerPaymentMethod
  comment?: string
  attachmentFile?: File | null
}

export interface ManagerCategoryOption {
  id: string
  /** Clé i18n pour le libellé */
  labelKey: TranslationKey
  /** Nom d’icône lucide */
  icon: "Package" | "Zap" | "Droplets" | "Wifi" | "Wrench" | "Truck" | "GraduationCap" | "MoreHorizontal"
}
