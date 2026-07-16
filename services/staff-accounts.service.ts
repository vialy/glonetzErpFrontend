"use client"

import { apiRequest } from "@/core/api/client"
import { mapStaffRole, type StaffRole } from "@/domains/staff"

/**
 * Compte de trésorerie d'un membre du staff.
 * - GET /staff/accounts/me        → solde du compte (manager : son compte ; admin : compte société)
 * - GET /staff/accounts/statement → toutes les entrées/sorties du compte (manager ou admin)
 *
 * Les permissions sont gérées côté backend ; le frontend appelle simplement
 * les endpoints partagés (le serveur renvoie le bon compte selon le rôle).
 */

export type TreasuryAccountType = "company" | "staff" | "virtual"

export type StaffAccount = {
  id: string
  accountId: string
  type: TreasuryAccountType
  name: string
  description?: string
  currencyCode: string
  balance: number
  isDefault: boolean
  isActive: boolean
}

export type StatementDirection = "in" | "out"
export type StatementSource = "payment" | "transfer" | "withdrawal" | "adjustment" | "expense"

export type StatementEntry = {
  id: string
  direction: StatementDirection
  source: StatementSource
  amount: number
  fee: number
  totalAmount: number
  /** Solde du compte juste après ce mouvement (closingBalance). */
  balanceAfter: number
  description: string
  createdAt: string
  counterpartyAccountId?: string
  withdrawalFriendlyId?: string
  categoryLabel?: string
}

export type StaffAccountOwner = {
  staffId?: string
  name?: string
  email?: string
  role?: StaffRole
}

/** Compte enrichi du propriétaire (renvoyé par GET /staff/accounts, admin). */
export type StaffAccountWithOwner = StaffAccount & {
  owner: StaffAccountOwner | null
}

type ApiAccountOwner = {
  staffId?: string
  name?: string
  email?: string
  role?: unknown
}

type ApiAccount = {
  _id?: string
  accountId?: string
  type?: string
  name?: string
  description?: string
  currencyCode?: string
  balance?: number
  isDefault?: boolean
  isActive?: boolean
  ownerStaffId?: ApiAccountOwner | string | null
}

type ApiAccountsPage = {
  docs?: ApiAccount[]
  totalPages?: number
  page?: number
}

type ApiTransaction = {
  transactionId?: string
  type?: string // "credit" | "debit"
  source?: string // "payment" | "transfer" | "withdrawal" | "adjustment"
  amount?: number
  fee?: number
  totalAmount?: number
  openingBalance?: number
  closingBalance?: number
  currencyCode?: string
  description?: string
  createdAt?: string
  accountFriendlyId?: string
  beneficiaryAccountFriendlyId?: string
  withdrawalFriendlyId?: string
  categoryLabel?: string
}

/** GET /staff/accounts/statement renvoie { account, ...result (mongoose-paginate) }. */
type ApiStatementPage = {
  account?: ApiAccount
  docs?: ApiTransaction[]
  totalPages?: number
  page?: number
}

const KNOWN_SOURCES: StatementSource[] = ["payment", "transfer", "withdrawal", "adjustment", "expense"]
const PAGE_SIZE = 100
const MAX_PAGES = 50

export const STAFF_ACCOUNTS_UPDATED_EVENT = "staff-accounts-updated"

function notifyAccountsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STAFF_ACCOUNTS_UPDATED_EVENT))
    window.dispatchEvent(new Event("manager-wallet-updated"))
  }
}

function mapAccountType(raw?: string): TreasuryAccountType {
  if (raw === "company") return "company"
  if (raw === "virtual") return "virtual"
  return "staff"
}

function mapAccount(raw: ApiAccount | null | undefined): StaffAccount | null {
  if (!raw) return null
  return {
    id: raw._id ?? raw.accountId ?? "",
    accountId: raw.accountId ?? "",
    type: mapAccountType(raw.type),
    name: raw.name ?? "",
    description: typeof raw.description === "string" ? raw.description : undefined,
    currencyCode: raw.currencyCode ?? "XAF",
    balance: typeof raw.balance === "number" ? raw.balance : 0,
    isDefault: Boolean(raw.isDefault),
    isActive: raw.isActive !== false,
  }
}

function mapTransaction(raw: ApiTransaction): StatementEntry {
  const direction: StatementDirection = (raw.type ?? "").toLowerCase() === "credit" ? "in" : "out"
  const source = (raw.source ?? "").toLowerCase()
  return {
    id: raw.transactionId ?? "",
    direction,
    source: (KNOWN_SOURCES.includes(source as StatementSource) ? source : "adjustment") as StatementSource,
    amount: raw.amount ?? 0,
    fee: raw.fee ?? 0,
    totalAmount: raw.totalAmount ?? raw.amount ?? 0,
    balanceAfter: typeof raw.closingBalance === "number" ? raw.closingBalance : 0,
    description: raw.description ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    counterpartyAccountId: raw.beneficiaryAccountFriendlyId || undefined,
    withdrawalFriendlyId: raw.withdrawalFriendlyId || undefined,
    categoryLabel: raw.categoryLabel || undefined,
  }
}

export type TransferToStaffInput = {
  /** Identifiant "friendly" du staff bénéficiaire (ex. STF-...). */
  beneficiaryStaffId: string
  amount: number
  fee?: number
  description?: string
}

/**
 * Transfert de fonds vers un autre membre du staff via POST /staff/accounts/transfer.
 * Pour un admin, le compte débité est automatiquement le compte société.
 * Crée côté backend une sortie (débit) chez l'initiateur et une entrée (crédit)
 * chez le bénéficiaire (ex. allocation admin → manager).
 */
export async function transferToStaff(input: TransferToStaffInput): Promise<void> {
  await apiRequest("/staff/accounts/transfer", {
    method: "POST",
    body: {
      beneficiaryStaffId: input.beneficiaryStaffId,
      amount: Math.round(input.amount),
      fee: input.fee ?? 0,
      description: input.description,
    },
  })
  notifyAccountsUpdated()
}

export type TreasuryTransferInput = {
  fromAccountId: string
  toAccountId: string
  amount: number
  description: string
}

/** Virement apparié entre comptes société / virtuels (admin). */
export async function transferBetweenTreasuryAccounts(input: TreasuryTransferInput): Promise<void> {
  await apiRequest("/staff/accounts/treasury-transfer", {
    method: "POST",
    body: {
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: Math.round(input.amount),
      description: input.description.trim(),
    },
  })
  notifyAccountsUpdated()
}

export type CreateVirtualAccountInput = {
  name: string
  description?: string
  currencyCode?: string
  balance?: number
}

export async function createVirtualAccount(input: CreateVirtualAccountInput): Promise<StaffAccount> {
  const data = await apiRequest<{ account?: ApiAccount }>("/staff/accounts/virtual", {
    method: "POST",
    body: {
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      currencyCode: input.currencyCode,
      balance: input.balance ?? 0,
    },
  })
  const account = mapAccount(data?.account)
  if (!account) throw new Error("INVALID_RESPONSE")
  notifyAccountsUpdated()
  return account
}

export type AdjustAccountInput = {
  type: "credit" | "debit"
  amount: number
  description: string
}

export async function adjustAccount(accountId: string, input: AdjustAccountInput): Promise<StaffAccount> {
  const data = await apiRequest<{ account?: ApiAccount }>(`/staff/accounts/${accountId}/adjust`, {
    method: "POST",
    body: {
      type: input.type,
      amount: Math.round(input.amount),
      description: input.description.trim(),
    },
  })
  const account = mapAccount(data?.account)
  if (!account) throw new Error("INVALID_RESPONSE")
  notifyAccountsUpdated()
  return account
}

export type UpdateVirtualAccountInput = {
  name?: string
  description?: string
  isActive?: boolean
}

export async function updateVirtualAccount(
  accountId: string,
  input: UpdateVirtualAccountInput,
): Promise<StaffAccount> {
  const data = await apiRequest<{ account?: ApiAccount }>(`/staff/accounts/virtual/${accountId}`, {
    method: "PATCH",
    body: input,
  })
  const account = mapAccount(data?.account)
  if (!account) throw new Error("INVALID_RESPONSE")
  notifyAccountsUpdated()
  return account
}

function mapOwner(raw: ApiAccount["ownerStaffId"]): StaffAccountOwner | null {
  if (!raw || typeof raw !== "object") return null
  return {
    staffId: typeof raw.staffId === "string" ? raw.staffId : undefined,
    name: typeof raw.name === "string" ? raw.name : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    role: raw.role !== undefined && raw.role !== null ? mapStaffRole(raw.role) : undefined,
  }
}

/**
 * Liste de TOUS les comptes (société + staff) via GET /staff/accounts (admin).
 * Chaque compte est enrichi de son propriétaire (nom, rôle) quand disponible.
 */
export async function fetchAllAccounts(): Promise<StaffAccountWithOwner[]> {
  const accounts: StaffAccountWithOwner[] = []
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<ApiAccountsPage>("/staff/accounts", {
      method: "GET",
      query: { pageNum, pageSize: PAGE_SIZE },
    })
    const docs = data?.docs ?? []
    for (const doc of docs) {
      const base = mapAccount(doc)
      if (!base) continue
      accounts.push({ ...base, owner: mapOwner(doc.ownerStaffId) })
    }
    const totalPages = data?.totalPages ?? 1
    if (docs.length < PAGE_SIZE || pageNum >= totalPages) break
    pageNum += 1
  }

  return accounts
}

/** Solde du compte courant via GET /staff/accounts/me. */
export async function fetchMyAccount(): Promise<StaffAccount | null> {
  const data = await apiRequest<{ account?: ApiAccount }>("/staff/accounts/me", { method: "GET" })
  return mapAccount(data?.account)
}

async function fetchStatementPages(
  path: string,
  params: { from?: string; to?: string } = {},
): Promise<{ account: StaffAccount | null; entries: StatementEntry[] }> {
  const entries: StatementEntry[] = []
  let account: StaffAccount | null = null
  let pageNum = 1

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await apiRequest<ApiStatementPage>(path, {
      method: "GET",
      query: { pageNum, pageSize: PAGE_SIZE, from: params.from, to: params.to },
    })

    if (!account) account = mapAccount(data?.account)
    const docs = data?.docs ?? []
    for (const doc of docs) entries.push(mapTransaction(doc))

    const totalPages = data?.totalPages ?? 1
    if (docs.length < PAGE_SIZE || pageNum >= totalPages) break
    pageNum += 1
  }

  return { account, entries }
}

/**
 * Relevé du compte (entrées/sorties) via GET /staff/accounts/statement.
 * Parcourt toutes les pages et renvoie aussi le compte (avec son solde).
 * Les bornes optionnelles `from`/`to` (ISO) sont transmises au back-end.
 */
export async function fetchAccountStatement(
  params: { from?: string; to?: string } = {},
): Promise<{ account: StaffAccount | null; entries: StatementEntry[] }> {
  return fetchStatementPages("/staff/accounts/statement", params)
}

/**
 * Relevé d'un compte société ou virtuel via GET /staff/accounts/:accountId/statement (admin).
 */
export async function fetchAccountStatementById(
  accountId: string,
  params: { from?: string; to?: string } = {},
): Promise<{ account: StaffAccount | null; entries: StatementEntry[] }> {
  return fetchStatementPages(`/staff/accounts/${accountId}/statement`, params)
}

/** Comptes de trésorerie admin : société + portefeuilles virtuels actifs. */
export async function fetchTreasuryWallets(): Promise<StaffAccount[]> {
  const all = await fetchAllAccounts()
  return all
    .filter((a) => a.isActive && (a.type === "company" || a.type === "virtual"))
    .sort((a, b) => {
      if (a.type === "company") return -1
      if (b.type === "company") return 1
      return a.name.localeCompare(b.name)
    })
}

export type NeeroMerchantBalanceSnapshot = {
  ledgerBalance: number
  neeroBalance: number | null
  gap: number | null
  currencyCode: string
  fetchedAt: string
  source: "neero" | "ledger_only" | "simulated" | "error"
  available: boolean
  paymentMethodId?: string
  message?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Solde Neero marchand en temps réel (admin) + comparaison ledger interne. */
export async function fetchNeeroMerchantBalance(): Promise<NeeroMerchantBalanceSnapshot> {
  const data = await apiRequest<unknown>("/staff/accounts/neero-balance", { method: "GET" })
  const row = asRecord(data) ?? {}
  const ledgerBalance = typeof row.ledgerBalance === "number" ? row.ledgerBalance : 0
  const neeroBalance = typeof row.neeroBalance === "number" ? row.neeroBalance : null
  const gap = typeof row.gap === "number" ? row.gap : neeroBalance !== null ? neeroBalance - ledgerBalance : null
  const source = row.source
  const normalizedSource =
    source === "neero" || source === "ledger_only" || source === "simulated" || source === "error"
      ? source
      : "error"

  return {
    ledgerBalance,
    neeroBalance,
    gap,
    currencyCode: typeof row.currencyCode === "string" ? row.currencyCode : "XAF",
    fetchedAt: typeof row.fetchedAt === "string" ? row.fetchedAt : new Date().toISOString(),
    source: normalizedSource,
    available: row.available === true,
    paymentMethodId: typeof row.paymentMethodId === "string" ? row.paymentMethodId : undefined,
    message: typeof row.message === "string" ? row.message : undefined,
  }
}
