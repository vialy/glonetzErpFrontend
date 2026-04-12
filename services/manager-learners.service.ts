"use client"

import type {
  LearnerPaymentStatusRow,
  ManagedLearner,
  ManagedLearnerRow,
  ManagerLearnerPayment,
  ManagerRecordedPaymentMethod,
} from "@/domains/manager-learners/types"

const STORAGE_KEY = "glonetz_manager_learners_v1"

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function seedLearners(): ManagedLearner[] {
  const t = new Date().toISOString()
  return [
    {
      id: "ELV-001",
      fullName: "Kouam Marie",
      phone: "+237600000101",
      className: "A2 - Mars 2026",
      tuitionDue: 162_000,
      currencyCode: "XOF",
      enrolledAt: t,
      payments: [
        {
          id: "PAY-1",
          recordedAt: t,
          amount: 100_000,
          method: "mtn_momo",
          note: "1er versement",
        },
      ],
    },
    {
      id: "ELV-002",
      fullName: "Ndjock Paul",
      phone: "+237600000102",
      className: "B1 - Mars 2026",
      tuitionDue: 180_000,
      currencyCode: "XOF",
      enrolledAt: t,
      payments: [],
    },
  ]
}

function readLearners(): ManagedLearner[] {
  if (!canUseStorage()) return seedLearners()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = seedLearners()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as ManagedLearner[]
    return Array.isArray(parsed) ? parsed : seedLearners()
  } catch {
    return seedLearners()
  }
}

function writeLearners(learners: ManagedLearner[]) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(learners))
  window.dispatchEvent(new Event("manager-learners-updated"))
}

function sumPayments(p: ManagerLearnerPayment[]) {
  return p.reduce((s, x) => s + x.amount, 0)
}

function normalizePhone(s: string) {
  return s.replace(/\s/g, "").trim()
}

export const ManagerLearnersService = {
  getAll(): ManagedLearner[] {
    return readLearners().sort((a, b) => (a.enrolledAt < b.enrolledAt ? 1 : -1))
  },

  getById(id: string): ManagedLearner | undefined {
    return readLearners().find((l) => l.id === id)
  },

  getPaymentRows(): LearnerPaymentStatusRow[] {
    return this.getAll().map((learner) => {
      const amountPaid = sumPayments(learner.payments)
      const remaining = Math.max(learner.tuitionDue - amountPaid, 0)
      let status: LearnerPaymentStatusRow["status"] = "impaye"
      if (remaining <= 0) status = "a_jour"
      else if (amountPaid > 0) status = "partiel"
      return { learner, amountPaid, remaining, status }
    })
  },

  createLearner(row: ManagedLearnerRow): ManagedLearner {
    if (!row.fullName.trim()) throw new Error("NAME_REQUIRED")
    if (!normalizePhone(row.phone)) throw new Error("PHONE_REQUIRED")
    if (!row.className.trim()) throw new Error("CLASS_REQUIRED")
    if (!Number.isFinite(row.tuitionDue) || row.tuitionDue <= 0) throw new Error("TUITION_INVALID")

    const learners = readLearners()
    const learner: ManagedLearner = {
      id: `ELV-${Date.now()}`,
      fullName: row.fullName.trim(),
      phone: normalizePhone(row.phone),
      birthDate: row.birthDate?.trim() || undefined,
      className: row.className.trim(),
      tuitionDue: row.tuitionDue,
      currencyCode: "XOF",
      enrolledAt: new Date().toISOString(),
      notes: row.notes?.trim() || undefined,
      payments: [],
    }
    writeLearners([learner, ...learners])
    return learner
  },

  bulkAppend(rows: ManagedLearnerRow[]): { imported: number; errors: string[] } {
    const existing = readLearners()
    const errors: string[] = []
    const newOnes: ManagedLearner[] = []
    rows.forEach((row, i) => {
      try {
        if (!row.fullName.trim()) throw new Error("name")
        if (!normalizePhone(row.phone)) throw new Error("phone")
        if (!row.className.trim()) throw new Error("class")
        if (!Number.isFinite(row.tuitionDue) || row.tuitionDue <= 0) throw new Error("tuition")
        newOnes.push({
          id: `ELV-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
          fullName: row.fullName.trim(),
          phone: normalizePhone(row.phone),
          birthDate: row.birthDate?.trim() || undefined,
          className: row.className.trim(),
          tuitionDue: row.tuitionDue,
          currencyCode: "XOF",
          enrolledAt: new Date().toISOString(),
          notes: row.notes?.trim() || undefined,
          payments: [],
        })
      } catch {
        errors.push(`Ligne ${i + 1}: invalide`)
      }
    })
    if (newOnes.length) {
      writeLearners([...newOnes, ...existing])
    }
    return { imported: newOnes.length, errors }
  },

  recordDeskPayment(
    learnerId: string,
    amount: number,
    method: ManagerRecordedPaymentMethod,
    note?: string
  ): void {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT")
    const learners = readLearners()
    const idx = learners.findIndex((l) => l.id === learnerId)
    if (idx === -1) throw new Error("NOT_FOUND")
    const learner = learners[idx]
    const paid = sumPayments(learner.payments)
    if (paid + amount > learner.tuitionDue + 0.01) throw new Error("OVERPAY")
    const payment: ManagerLearnerPayment = {
      id: `PAY-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      amount,
      method,
      note: note?.trim() || undefined,
    }
    const updated = { ...learner, payments: [payment, ...learner.payments] }
    const next = [...learners]
    next[idx] = updated
    writeLearners(next)
  },

  parseCsv(text: string): ManagedLearnerRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return []
    const delim = lines[0].includes(";") ? ";" : ","
    const rawRows = lines.map((line) => line.split(delim).map((c) => c.trim().replace(/^"|"$/g, "")))
    const header = rawRows[0].map((h) => h.toLowerCase())
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((h) => h === n || h.includes(n))
        if (i >= 0) return i
      }
      return -1
    }
    const iName = idx(["nom", "name", "fullname", "prenom_nom"])
    const iPhone = idx(["telephone", "phone", "tel", "mobile"])
    const iClass = idx(["classe", "class", "niveau", "groupe"])
    const iTuition = idx(["pension", "tuition", "montant", "du", "frais"])
    const iBirth = idx(["naissance", "birth", "date_naissance"])
    const hasHeader =
      iName >= 0 || (header[0] && !/^\d+$/.test(header[0]) && header.some((h) => /nom|name|tel|classe/i.test(h)))
    const dataRows = hasHeader ? rawRows.slice(1) : rawRows
    const out: ManagedLearnerRow[] = []
    for (const cells of dataRows) {
      const name =
        iName >= 0 ? cells[iName] : cells[0]
      const phone =
        iPhone >= 0 ? cells[iPhone] : cells[1]
      const className =
        iClass >= 0 ? cells[iClass] : cells[2] ?? "A1"
      const tuitionStr =
        iTuition >= 0 ? cells[iTuition] : cells[3] ?? "162000"
      const birth =
        iBirth >= 0 ? cells[iBirth] : undefined
      const tuition = Number(String(tuitionStr).replace(/\s/g, ""))
      if (name && phone) {
        out.push({
          fullName: name,
          phone,
          className: className || "A1",
          tuitionDue: Number.isFinite(tuition) ? tuition : 162_000,
          birthDate: birth,
        })
      }
    }
    return out
  },

  /**
   * Tous les versements enregistrés auprès des apprenants (guichet, MTN, Orange, etc.),
   * du plus récent au plus ancien.
   */
  getAllRecordedLearnerPayments(): {
    learnerId: string
    learnerName: string
    className: string
    payment: ManagerLearnerPayment
  }[] {
    const out: {
      learnerId: string
      learnerName: string
      className: string
      payment: ManagerLearnerPayment
    }[] = []
    for (const l of this.getAll()) {
      for (const p of l.payments) {
        out.push({
          learnerId: l.id,
          learnerName: l.fullName,
          className: l.className,
          payment: p,
        })
      }
    }
    return out.sort((a, b) => (a.payment.recordedAt < b.payment.recordedAt ? 1 : -1))
  },
}
