import type { ManagerRecordedPaymentMethod } from "@/domains/manager-learners/types"
import { canonicalAdminUserPhone, parseAdminUserPhone } from "@/lib/admin-user-phone"
import { deriveClassSession } from "@/lib/class-session"

export type AdminClassStatus = "active" | "finished" | "archived"

export interface AdminClass {
  id: string
  name: string
  /** Presentation libre : objectifs, filiere, remarques admin. */
  description: string
  session: string
  periodStart: string
  periodEnd: string
  status: AdminClassStatus
  learnersCount: number
  tuitionAmount: number
  totalDue: number
  totalPaid: number
  chartData: { label: string; paid: number }[]
}

export interface AdminLearner {
  id: string
  fullName: string
  phone: string
  classId: string
  createdAt: string
  dateOfBirth: string
  pinInitialized: boolean
  mustChangePin: boolean
  status: "active" | "suspended"
  due: number
  paid: number
}

export interface AdminPaymentItem {
  id: string
  operatorReference?: string
  /** Lie l'encaissement a un apprenant (filtre historique fiche). */
  learnerId?: string
  /** Identifiant (friendly) de la classe — utilise pour agreger l'encaisse par classe. */
  classId?: string
  learnerName: string
  className: string
  amount: number
  method: "MTN" | "Orange" | "Especes"
  createdAt: string
  status: "success" | "pending" | "manual"
  /** Saisie guichet / commentaire interne (optionnel). */
  note?: string
}

export interface AdminExpenseItem {
  id: string
  type: "manager" | "extra"
  label: string
  amount: number
  createdAt: string
}

export interface AdminUserItem {
  id: string
  fullName: string
  role: "admin" | "manager" | "accountant" | "student"
  phone: string
  status: "active" | "inactive"
}

export interface AdminAuditItem {
  id: string
  actor: string
  action: string
  target: string
  createdAt: string
}

export interface AdminClassTransitionItem {
  id: string
  learnerId: string
  learnerName: string
  fromClassId: string
  fromClassName: string
  toClassId: string
  toClassName: string
  createdAt: string
  actor: string
  reason?: string
}

const chart = (base: number) =>
  ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin"].map((label, i) => ({
    label,
    paid: Math.round(base + i * 8000),
  }))

const DEFAULT_ADMIN_CLASSES: AdminClass[] = [
  {
    id: "a1-jan-2025",
    name: "A1 - Jan 2025",
    description: "Niveau debutant — cohorte janvier 2025, formation generale.",
    session: "Jan 2025",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-30",
    status: "active",
    learnersCount: 3,
    tuitionAmount: 162_000,
    totalDue: 486_000,
    totalPaid: 410_000,
    chartData: chart(120_000),
  },
  {
    id: "a2-apr-2025",
    name: "A2 - Apr 2025",
    description: "Niveau intermediaire — rentree avril 2025.",
    session: "Avr 2025",
    periodStart: "2025-04-01",
    periodEnd: "2025-09-30",
    status: "active",
    learnersCount: 2,
    tuitionAmount: 170_000,
    totalDue: 340_000,
    totalPaid: 120_000,
    chartData: chart(80_000),
  },
  {
    id: "b1-sep-2024",
    name: "B1 - Sep 2024",
    description: "Cohorte terminee — session septembre 2024.",
    session: "Sep 2024",
    periodStart: "2024-09-01",
    periodEnd: "2025-03-31",
    status: "finished",
    learnersCount: 1,
    tuitionAmount: 180_000,
    totalDue: 180_000,
    totalPaid: 180_000,
    chartData: chart(150_000),
  },
]

const ADMIN_CLASSES_STORAGE_KEY = "glonetz_admin_classes_v1"

function canUseClassesStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readAdminClassesFromStorage(): AdminClass[] | null {
  if (!canUseClassesStorage()) return null
  const raw = localStorage.getItem(ADMIN_CLASSES_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminClass[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeAdminClasses(next: AdminClass[]) {
  if (!canUseClassesStorage()) return
  localStorage.setItem(ADMIN_CLASSES_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("admin-classes-updated"))
}

export function getAdminClasses(): AdminClass[] {
  const stored = readAdminClassesFromStorage()
  if (stored) {
    return stored.map((c) => ({
      ...c,
      description: typeof c.description === "string" ? c.description : "",
      chartData: Array.isArray(c.chartData) && c.chartData.length > 0 ? c.chartData : chart(Math.max(10_000, Math.round(c.tuitionAmount * 0.2))),
    }))
  }
  return DEFAULT_ADMIN_CLASSES.map((c) => ({ ...c }))
}

export function addAdminClass(input: {
  name: string
  session?: string
  periodStart: string
  periodEnd: string
  status?: AdminClassStatus
  tuitionAmount: number
  description?: string
  locale?: "fr" | "en"
}): AdminClass {
  const id = `cls-${Date.now()}`
  const tuitionAmount = Math.round(input.tuitionAmount)
  const baseChart = Math.max(15_000, Math.round(tuitionAmount * 0.25))
  const session =
    input.session?.trim() ||
    deriveClassSession(input.periodStart, input.periodEnd, input.locale ?? "fr")
  const newClass: AdminClass = {
    id,
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    session,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status: input.status ?? "active",
    learnersCount: 0,
    tuitionAmount,
    totalDue: 0,
    totalPaid: 0,
    chartData: chart(baseChart),
  }
  const list = getAdminClasses()
  writeAdminClasses([newClass, ...list])
  return newClass
}

export function updateAdminClass(
  classId: string,
  patch: {
    name?: string
    description?: string
    session?: string
    periodStart?: string
    periodEnd?: string
    status?: AdminClassStatus
    tuitionAmount?: number
    locale?: "fr" | "en"
  },
): AdminClass | undefined {
  const list = getAdminClasses()
  const index = list.findIndex((c) => c.id === classId)
  if (index < 0) return undefined

  const current = list[index]
  const periodStart = patch.periodStart ?? current.periodStart
  const periodEnd = patch.periodEnd ?? current.periodEnd
  const session =
    patch.session?.trim() ||
    (patch.periodStart || patch.periodEnd
      ? deriveClassSession(periodStart, periodEnd, patch.locale ?? "fr")
      : current.session)

  const updated: AdminClass = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    description: patch.description !== undefined ? patch.description.trim() : current.description,
    session,
    periodStart,
    periodEnd,
    status: patch.status ?? current.status,
    tuitionAmount:
      patch.tuitionAmount !== undefined ? Math.round(patch.tuitionAmount) : current.tuitionAmount,
  }

  const next = [...list]
  next[index] = updated
  writeAdminClasses(next)
  return updated
}

/** @deprecated Utiliser getAdminClasses() */
export const adminClasses: AdminClass[] = DEFAULT_ADMIN_CLASSES

const DEFAULT_ADMIN_LEARNERS: AdminLearner[] = [
  {
    id: "l1",
    fullName: "Nina Talla",
    phone: "677100001",
    classId: "a1-jan-2025",
    createdAt: "2025-01-10",
    dateOfBirth: "2000-01-01",
    pinInitialized: true,
    mustChangePin: false,
    status: "active",
    due: 162_000,
    paid: 162_000,
  },
  {
    id: "l2",
    fullName: "Paul Etame",
    phone: "677100002",
    classId: "a1-jan-2025",
    createdAt: "2025-01-11",
    dateOfBirth: "1999-05-15",
    pinInitialized: true,
    mustChangePin: false,
    status: "active",
    due: 162_000,
    paid: 150_000,
  },
  {
    id: "l3",
    fullName: "Merveille Ngo",
    phone: "677100003",
    classId: "a1-jan-2025",
    createdAt: "2025-01-12",
    dateOfBirth: "2001-03-20",
    pinInitialized: true,
    mustChangePin: false,
    status: "active",
    due: 162_000,
    paid: 98_000,
  },
  {
    id: "l4",
    fullName: "Joel Mekongo",
    phone: "677100004",
    classId: "a2-apr-2025",
    createdAt: "2025-04-05",
    dateOfBirth: "1998-11-11",
    pinInitialized: true,
    mustChangePin: false,
    status: "active",
    due: 170_000,
    paid: 100_000,
  },
  {
    id: "l5",
    fullName: "Brice Kotto",
    phone: "677100005",
    classId: "a2-apr-2025",
    createdAt: "2025-04-06",
    dateOfBirth: "2000-07-07",
    pinInitialized: true,
    mustChangePin: false,
    status: "active",
    due: 170_000,
    paid: 20_000,
  },
  {
    id: "l6",
    fullName: "Lina Yene",
    phone: "677100006",
    classId: "b1-sep-2024",
    createdAt: "2025-12-15",
    dateOfBirth: "1999-09-09",
    pinInitialized: true,
    mustChangePin: false,
    status: "suspended",
    due: 180_000,
    paid: 180_000,
  },
]

/** @deprecated Utiliser getAdminLearners() pour les donnees a jour (localStorage). */
export const adminLearners: AdminLearner[] = DEFAULT_ADMIN_LEARNERS

const ADMIN_LEARNERS_STORAGE_KEY = "glonetz_admin_learners_v1"

function canUseLearnersStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readAdminLearnersFromStorage(): AdminLearner[] | null {
  if (!canUseLearnersStorage()) return null
  const raw = localStorage.getItem(ADMIN_LEARNERS_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminLearner[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeAdminLearners(next: AdminLearner[]) {
  if (!canUseLearnersStorage()) return
  localStorage.setItem(ADMIN_LEARNERS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("admin-learners-updated"))
}

export function getAdminLearners(): AdminLearner[] {
  const stored = readAdminLearnersFromStorage()
  if (stored) return stored.map((l) => ({ ...l }))
  return DEFAULT_ADMIN_LEARNERS.map((l) => ({ ...l }))
}

export function addAdminLearner(input: {
  fullName: string
  phone: string
  classId: string
  email?: string
  dateOfBirth?: string
}): AdminLearner {
  const list = getAdminLearners()
  const cls = getClassById(input.classId)
  const tuition = cls?.tuitionAmount ?? 162_000
  const learner: AdminLearner = {
    id: `l${Date.now()}`,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    classId: input.classId,
    createdAt: new Date().toISOString(),
    dateOfBirth: input.dateOfBirth ?? "",
    pinInitialized: true,
    mustChangePin: true,
    status: "active",
    due: tuition,
    paid: 0,
  }
  writeAdminLearners([learner, ...list])
  return learner
}

export function updateLearner(
  learnerId: string,
  patch: Partial<Pick<AdminLearner, "fullName" | "phone" | "classId" | "dateOfBirth">>,
): AdminLearner {
  const list = getAdminLearners()
  const idx = list.findIndex((l) => l.id === learnerId)
  if (idx === -1) throw new Error("LEARNER_NOT_FOUND")
  const prev = list[idx]
  const next: AdminLearner = { ...prev, ...patch }
  const nextList = [...list]
  nextList[idx] = next
  writeAdminLearners(nextList)
  if (patch.fullName !== undefined && patch.fullName !== prev.fullName) {
    syncPaymentsLearnerName(learnerId, next.fullName)
  }
  return next
}

export function setLearnerStatus(learnerId: string, status: AdminLearner["status"]): AdminLearner {
  const list = getAdminLearners()
  const idx = list.findIndex((l) => l.id === learnerId)
  if (idx === -1) throw new Error("LEARNER_NOT_FOUND")
  const next: AdminLearner = { ...list[idx], status }
  const nextList = [...list]
  nextList[idx] = next
  writeAdminLearners(nextList)
  return next
}

function syncPaymentsLearnerName(learnerId: string, fullName: string) {
  const payments = getAdminPayments()
  const updated = payments.map((p) => (p.learnerId === learnerId ? { ...p, learnerName: fullName } : p))
  writeAdminPayments(updated)
}

/** Genere un PIN a 8 chiffres et impose un changement a la prochaine connexion. */
export function resetLearnerPin(learnerId: string): { pin: string; phone: string } {
  const list = getAdminLearners()
  const idx = list.findIndex((l) => l.id === learnerId)
  if (idx === -1) throw new Error("LEARNER_NOT_FOUND")
  const pin = String(10_000_000 + Math.floor(Math.random() * 90_000_000))
  const next: AdminLearner = {
    ...list[idx],
    pinInitialized: true,
    mustChangePin: true,
  }
  const nextList = [...list]
  nextList[idx] = next
  writeAdminLearners(nextList)
  return { pin, phone: next.phone }
}

/** Simulation d'envoi SMS — aucun envoi reel ; message dans la console pour debug. */
export function sendLearnerPinSmsMock(phone: string, pin: string): void {
  const text = `[Glonetz] Votre nouveau code PIN est ${pin}. Ne le partagez pas. Connectez-vous sur l'application Glonetz.`
  console.info(`[SMS mock] -> ${phone}: ${text}`)
}

export function getPaymentsForLearner(learnerId: string, learnerName: string): AdminPaymentItem[] {
  return getAdminPayments()
    .filter(
      (p) =>
        p.learnerId === learnerId ||
        (!p.learnerId && p.learnerName.trim().toLowerCase() === learnerName.trim().toLowerCase()),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

const ADMIN_PAYMENTS_STORAGE_KEY = "glonetz_admin_payments_v1"

const DEFAULT_ADMIN_PAYMENTS: AdminPaymentItem[] = [
  {
    id: "p1",
    learnerId: "l1",
    operatorReference: "MTN-NINA-54000",
    learnerName: "Nina Talla",
    className: "A1 - Jan 2025",
    amount: 54_000,
    method: "MTN",
    createdAt: "2026-03-25 10:20",
    status: "success",
  },
  {
    id: "p2",
    learnerId: "l1",
    operatorReference: "OM-NINA-108000",
    learnerName: "Nina Talla",
    className: "A1 - Jan 2025",
    amount: 108_000,
    method: "Orange",
    createdAt: "2026-03-10 14:00",
    status: "success",
  },
  {
    id: "p2b",
    learnerId: "l2",
    operatorReference: "OM-PAUL-50000",
    learnerName: "Paul Etame",
    className: "A1 - Jan 2025",
    amount: 50_000,
    method: "Orange",
    createdAt: "2026-03-26 08:15",
    status: "success",
  },
  {
    id: "p3",
    learnerId: "l3",
    learnerName: "Merveille Ngo",
    className: "A1 - Jan 2025",
    amount: 48_000,
    method: "Especes",
    createdAt: "2026-03-26 16:33",
    status: "manual",
  },
  {
    id: "p4",
    learnerId: "l5",
    operatorReference: "OM-BRICE-60060",
    learnerName: "Brice Kotto",
    className: "A2 - Apr 2025",
    amount: 60_000,
    method: "Orange",
    createdAt: "2026-03-27 09:05",
    status: "pending",
  },
]

function canUseAdminPaymentsStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readAdminPaymentsFromStorage(): AdminPaymentItem[] | null {
  if (!canUseAdminPaymentsStorage()) return null
  const raw = localStorage.getItem(ADMIN_PAYMENTS_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminPaymentItem[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeAdminPayments(next: AdminPaymentItem[]) {
  if (!canUseAdminPaymentsStorage()) return
  localStorage.setItem(ADMIN_PAYMENTS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("admin-payments-updated"))
}

export function getAdminPayments(): AdminPaymentItem[] {
  const stored = readAdminPaymentsFromStorage()
  const base = stored ? stored : DEFAULT_ADMIN_PAYMENTS.map((p) => ({ ...p }))
  const defaultsById = new Map(DEFAULT_ADMIN_PAYMENTS.map((p) => [p.id, p]))
  return base.map((p) => {
    if (p.learnerId) return p
    const d = defaultsById.get(p.id)
    return d?.learnerId ? { ...p, learnerId: d.learnerId } : p
  })
}

function formatAdminPaymentTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Versement guichet (meme logique que le manager) : met a jour solde apprenant, liste paiements et total encaisse classe. */
export function recordAdminDeskPayment(
  learnerId: string,
  amount: number,
  method: ManagerRecordedPaymentMethod,
  note?: string,
): AdminPaymentItem {
  const learners = getAdminLearners()
  const idx = learners.findIndex((l) => l.id === learnerId)
  if (idx === -1) throw new Error("LEARNER_NOT_FOUND")
  const learner = learners[idx]
  const remaining = learner.due - learner.paid
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT")
  if (amount > remaining + 0.01) throw new Error("OVERPAY")

  const cls = getClassById(learner.classId)
  const className = cls?.name ?? learner.classId
  const now = new Date()
  const suffix = String(now.getTime()).slice(-6)

  const methodOut: AdminPaymentItem["method"] =
    method === "orange_money" ? "Orange" : method === "mtn_momo" ? "MTN" : "Especes"
  const status: AdminPaymentItem["status"] = method === "cash" ? "manual" : "success"
  const operatorReference =
    method === "cash" ? `CAISSE-${suffix}` : method === "mtn_momo" ? `MTN-ADM-${suffix}` : `OM-ADM-${suffix}`

  const payment: AdminPaymentItem = {
    id: `pay-${now.getTime()}`,
    learnerId,
    operatorReference,
    learnerName: learner.fullName,
    className,
    amount,
    method: methodOut,
    createdAt: formatAdminPaymentTimestamp(now),
    status,
    note: note?.trim() || undefined,
  }

  const nextLearner: AdminLearner = { ...learner, paid: learner.paid + amount }
  const nextLearners = [...learners]
  nextLearners[idx] = nextLearner
  writeAdminLearners(nextLearners)

  const payments = getAdminPayments()
  writeAdminPayments([payment, ...payments])

  if (cls) {
    const classes = getAdminClasses()
    const cIdx = classes.findIndex((c) => c.id === cls.id)
    if (cIdx !== -1) {
      const c = classes[cIdx]
      const nextClass: AdminClass = { ...c, totalPaid: c.totalPaid + amount }
      const nc = [...classes]
      nc[cIdx] = nextClass
      writeAdminClasses(nc)
    }
  }

  return payment
}

export function findAdminPaymentByReference(raw: string): AdminPaymentItem | undefined {
  const q = raw.trim().toLowerCase()
  if (!q) return undefined
  return getAdminPayments().find((p) => {
    if (p.id.toLowerCase() === q) return true
    const op = (p.operatorReference ?? "").trim().toLowerCase()
    return op.length > 0 && op === q
  })
}

export function resolvePendingAdminPaymentToSuccess(paymentId: string): {
  payment: AdminPaymentItem
  updated: boolean
} {
  const list = getAdminPayments()
  const index = list.findIndex((p) => p.id === paymentId)
  if (index === -1) throw new Error("PAYMENT_NOT_FOUND")
  const row = list[index]
  if (row.status !== "pending") {
    return { payment: row, updated: false }
  }
  const payment: AdminPaymentItem = { ...row, status: "success" }
  const next = [...list]
  next[index] = payment
  writeAdminPayments(next)
  return { payment, updated: true }
}

export const adminExpenses: AdminExpenseItem[] = [
  { id: "e1", type: "manager", label: "Achat fournitures", amount: 42_000, createdAt: "2026-03-23" },
  { id: "e2", type: "manager", label: "Transport equipe", amount: 35_000, createdAt: "2026-03-24" },
  { id: "e3", type: "extra", label: "Maintenance locaux", amount: 180_000, createdAt: "2026-03-21" },
  { id: "e4", type: "extra", label: "Remplacement projecteur", amount: 95_000, createdAt: "2026-03-20" },
]

const DEFAULT_ADMIN_USERS: AdminUserItem[] = [
  { id: "u1", fullName: "Super Admin", role: "admin", phone: "677200001", status: "active" },
  { id: "u2", fullName: "Manager Centre", role: "manager", phone: "677200002", status: "active" },
  { id: "u3", fullName: "Comptable Externe", role: "accountant", phone: "677200003", status: "active" },
  { id: "u4", fullName: "Nina Talla", role: "student", phone: "677100001", status: "active" },
]

/** @deprecated Utiliser getAdminUsers() pour les donnees a jour (localStorage). */
export const adminUsers: AdminUserItem[] = DEFAULT_ADMIN_USERS

const ADMIN_USERS_STORAGE_KEY = "glonetz_admin_users_v1"

function canUseUsersStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readAdminUsersFromStorage(): AdminUserItem[] | null {
  if (!canUseUsersStorage()) return null
  const raw = localStorage.getItem(ADMIN_USERS_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminUserItem[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeAdminUsers(next: AdminUserItem[]) {
  if (!canUseUsersStorage()) return
  localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("admin-users-updated"))
}

export function getAdminUsers(): AdminUserItem[] {
  const stored = readAdminUsersFromStorage()
  if (stored) return stored.map((u) => ({ ...u }))
  return DEFAULT_ADMIN_USERS.map((u) => ({ ...u }))
}

export function getAdminUserById(userId: string): AdminUserItem | undefined {
  return getAdminUsers().find((u) => u.id === userId)
}

function resolveAdminUserPhone(phone: string): string {
  const parsed = parseAdminUserPhone(phone)
  if (!parsed.ok) {
    if (parsed.error === "empty") throw new Error("PHONE_REQUIRED")
    throw new Error("PHONE_INVALID_FORMAT")
  }
  return parsed.e164
}

function phoneAlreadyUsed(phoneE164: string, exceptUserId?: string): boolean {
  const key = canonicalAdminUserPhone(phoneE164)
  return getAdminUsers().some(
    (u) => u.id !== exceptUserId && canonicalAdminUserPhone(u.phone) === key,
  )
}

export function createAdminUser(input: {
  fullName: string
  phone: string
  role: AdminUserItem["role"]
}): AdminUserItem {
  const fullName = input.fullName.trim()
  if (!fullName) throw new Error("NAME_REQUIRED")
  const phone = resolveAdminUserPhone(input.phone)

  const list = getAdminUsers()
  if (phoneAlreadyUsed(phone)) {
    throw new Error("PHONE_ALREADY_USED")
  }

  const user: AdminUserItem = {
    id: `u-${Date.now()}`,
    fullName,
    phone,
    role: input.role,
    status: "active",
  }
  writeAdminUsers([user, ...list])
  return user
}

export function updateAdminUser(
  userId: string,
  patch: Partial<Pick<AdminUserItem, "fullName" | "phone" | "role" | "status">>,
): AdminUserItem {
  const list = getAdminUsers()
  const idx = list.findIndex((u) => u.id === userId)
  if (idx === -1) throw new Error("USER_NOT_FOUND")

  const prev = list[idx]
  const phone = patch.phone !== undefined ? resolveAdminUserPhone(patch.phone) : prev.phone

  if (patch.phone !== undefined && canonicalAdminUserPhone(phone) !== canonicalAdminUserPhone(prev.phone)) {
    if (phoneAlreadyUsed(phone, userId)) {
      throw new Error("PHONE_ALREADY_USED")
    }
  }

  const fullName = patch.fullName !== undefined ? patch.fullName.trim() : prev.fullName
  if (!fullName) throw new Error("NAME_REQUIRED")

  const next: AdminUserItem = {
    ...prev,
    ...patch,
    fullName,
    phone,
  }
  const nextList = [...list]
  nextList[idx] = next
  writeAdminUsers(nextList)
  return next
}

export function setAdminUserStatus(userId: string, status: AdminUserItem["status"]): AdminUserItem {
  return updateAdminUser(userId, { status })
}

/** Reinitialise le PIN (simulation admin). */
export function resetAdminUserPin(userId: string): { pin: string; phone: string; fullName: string } {
  const user = getAdminUserById(userId)
  if (!user) throw new Error("USER_NOT_FOUND")
  const pin = String(Math.floor(100000 + Math.random() * 900000))
  return { pin, phone: user.phone, fullName: user.fullName }
}

export const adminAudits: AdminAuditItem[] = [
  { id: "a1", actor: "Super Admin", action: "Validation reclamation", target: "Reclamation #REC-392", createdAt: "2026-03-26 12:15" },
  { id: "a2", actor: "Super Admin", action: "Allocation budget manager", target: "150000 FCFA", createdAt: "2026-03-25 09:00" },
  { id: "a3", actor: "Manager Centre", action: "Ajout depense", target: "Achat fournitures", createdAt: "2026-03-24 14:11" },
]

export const adminClassTransitions: AdminClassTransitionItem[] = [
  {
    id: "ct1",
    learnerId: "l4",
    learnerName: "Joel Mekongo",
    fromClassId: "a1-jan-2025",
    fromClassName: "A1 - Jan 2025",
    toClassId: "a2-apr-2025",
    toClassName: "A2 - Apr 2025",
    createdAt: "2026-03-10 09:20",
    actor: "Super Admin",
  },
  {
    id: "ct2",
    learnerId: "l5",
    learnerName: "Brice Kotto",
    fromClassId: "a1-jan-2025",
    fromClassName: "A1 - Jan 2025",
    toClassId: "a2-apr-2025",
    toClassName: "A2 - Apr 2025",
    createdAt: "2026-03-10 09:24",
    actor: "Super Admin",
    reason: "Promotion validee apres regularisation partielle",
  },
]

export function formatFcfa(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`
}

export function getClassById(classId: string): AdminClass | undefined {
  return getAdminClasses().find((item) => item.id === classId)
}

export function getLearnerById(learnerId: string): AdminLearner | undefined {
  return getAdminLearners().find((item) => item.id === learnerId)
}

export function getTransitionsByClassId(classId: string): AdminClassTransitionItem[] {
  return adminClassTransitions.filter((item) => item.fromClassId === classId || item.toClassId === classId)
}
